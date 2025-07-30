import OpenAI from "openai";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";

dotenv.config();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// set up express server
const app = express();
app.use(cors());
app.use(express.json());

// set up the chatbot
const messages = [
  {
    role: "system",
    content:
      "You are a doctor. Ask the user about any symptoms they have and try to diagnose them. If you need more information, ask for it. Introduce yourself as Dr. AI at the start of the conversation. Look in the conditions library for possible conditions based on the symptoms provided by the user. If you are not sure about the diagnosis, ask the user to visit a real doctor. The first element is the severity. If it's emergency, ask the user to call emergency services immediately. If it's not an emergency, ask the user to visit a doctor as soon as possible.",
  },
];
// conditions library (simple example)
// the first element is the severity of the condition
// "mild", "moderate", "emergency"
const conditionsLibrary = {
  "covid": ["moderate","fever", "dry cough", "fatigue", "shortness of breath"],
  "measles": ["moderate","fever", "rash", "conjunctivitis"],
  "heart_attack": ["emergency","chest pain", "shortness of breath", "nausea"],
  "allergy": ["mild","sneezing", "itchy eyes", "runny nose"],
  "flu": ["moderate","fever", "chills", "body aches", "fatigue"]
};

// set up post to handle chat messages
app.post("/chat", async (req, res) => {
  const userInput = req.body.message;
  // check if userInput is provided
  if (!userInput) {
    return res.status(400).json({ error: "No input provided." });
  }
  // add user input to messages
  messages.push({ role: "user", content: userInput });

  // set up headers for message streaming
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    // connect to OpenAI API and stream the response
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      stream: true,
    });
    // process the streamed response
    let assistantResponse = "";
    // the response is streamed in parts
    // we will concatenate the parts to form the complete response
    for await (const part of completion) {
      const content = part.choices[0]?.delta?.content;
      if (content) {
        assistantResponse += content;
        res.write(`data: ${content}\n\n`);
      }
    }

    messages.push({ role: "assistant", content: assistantResponse });
    // finishes sending the response
    res.write(`data: [DONE]\n\n`);
    res.end();
    // in case of an error, send an error message
  } catch (error) {
    console.error("Error generating response:", error);
    res.write(`data: Error generating response\n\n`);
    res.end();
  }
});

// set up post to handle feedback
app.post("/feedback", (req, res) => {
  // type = "positive" or "negative"
  // msg = feedback message
  // timestamp = current time in ISO format
  const { type, msg } = req.body;
  const feedbackData = {
    type: type,
    feedback: msg,
    timestamp: new Date().toISOString(),
  };
  
  // read the existing feedback file or create a new one if it doesn't exist
  fs.readFile("feedback.json", "utf8", (err, data) => {
    let feedbackList = [];
    if (err) {
      console.error("Error reading feedback file:", err);
    } else {
      try {
        feedbackList = JSON.parse(data);
      } catch (parseError) {
        console.error("Error parsing feedback file:", parseError);
      }
    }
    feedbackList.push(feedbackData);

    // write the updated feedback list end to the file
    fs.writeFile("feedback.json", JSON.stringify(feedbackList, null, 2), (err) => {
      if (err) {
        console.error("Error writing feedback file:", err);
        return res.status(500).json({ error: "Failed to save feedback." });
      }
      res.status(200).json({ message: "Feedback saved successfully." });
    });
  });
});

// listener for requests on port 3001
app.listen(3001, () => {
  console.log("Server running at http://localhost:3001");
});