import React from "react";
import {
  Container, Typography, TextField, Button, Paper, List, ListItem, ListItemText, CircularProgress, Box,
} from "@mui/material";

function App() {
  // states to manage messages, input, and loading status
  // messages: array of message objects with role and content
  // input: string for user input
  // isLoading: boolean to indicate if the chatbot is processing a request
  const [messages, setMessages] = React.useState([
    { role: "assistant", content: "Hello! My name is Dr. AI, how can I assist you today?" },
  ]);
  const [input, setInput] = React.useState("");
  const [isLoading, setLoading] = React.useState(false);

  const [isFeedbackSent, setFeedbackSent] = React.useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = React.useState(false);
  const [feedback, setFeedback] = React.useState("");


  // load messages from local storage
  React.useEffect(() => {
    const savedMessages = localStorage.getItem("messages");
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  // dependency array is empty, so it will only run once
  }, []);

  // save messages to local storage whenever messages state changes
  // this allows the chat history to persist across page reloads
  React.useEffect(() => {
    localStorage.setItem("messages", JSON.stringify(messages));
    // dependency array includes messages, so it will run whenever messages change
  }, [messages]);

  // clear messages state and local storage
  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem("messages");
    setInput("");
    setLoading(false);
    // reset the chat with a welcome message
    setMessages([{ role: "assistant", content: "Hello! My name is Dr. AI, how can I assist you today?" }]);
  };

  // function to handle sending messages
  const handleSend = async () => {
    // check if input is empty
    // if empty, do nothing
    if (!input.trim()) return;
    // create a user message object
    const userMessage = { role: "user", content: input };
    // new array of messages with the user message added
    const newMessages = [...messages, userMessage];
    // update messages state with new messages
    // clear the input field
    // set loading state to true
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // make a POST request to the server with the user input
      // set headers for JSON content type
      const response = await fetch("http://localhost:3001/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // send the user input as JSON in the request body
        body: JSON.stringify({ message: input }),
      });

      // reads and decodes the response body as a stream in chunks
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let assistantResponse = "";
      // function to process the streamed response
      const streamAssistantResponse = async () => {
        while (true) {
          // read a chunk from the stream
          // if done, break the loop
          const { done, value } = await reader.read();
          if (done) break;
          // decode the chunk and split it into lines
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n\n");
          // loads each line and checks if it starts with "data: " (format used by server-sent events)
          for (let line of lines) {
            if (line.startsWith("data: ")) {
              // remove the "data: " prefix so it's just the content
              // if the data is "[DONE]", set loading to false and return (since [DONE] indicates the end of the response)
              const data = line.replace("data: ", "");
              if (data === "[DONE]") {
                setLoading(false);
                return;
              }
              // concatenate the data to the assistant response
              assistantResponse += data;
              // update the messages state with the new assistant response, which re-renders the UI
              setMessages([...newMessages, { role: "assistant", content: assistantResponse }]);
            }
          }
        }
      };
      // call the function and wait for it to finish before proceeding
      await streamAssistantResponse();
    } catch (error) {
      // if there's an error, log it to the console, stop loading, and update the messages state with an error message
      // this will display an error message in the chat UI
      console.error("Error:", error);
      setLoading(false);
      setMessages([...newMessages, { role: "assistant", content: "Sorry, something went wrong." }]);
    }
  };

  // function to handle feedback submission
  // type: "positive" or "negative"
  // msg: feedback message
  const handleFeedback = async (type, msg) => {
    try {
      // make a POST request to the server with the feedback data
        await fetch("http://localhost:3001/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({type, message: msg}),
      });
      console.log("Feedback sent:", type, msg);
      // mark feedback as sent
      // hide the feedback form if it was shown
      setFeedbackSent(true);
      setShowFeedbackForm(false);
    }
    catch (error) {
      console.error("Error sending feedback:", error);
    }
    
  };

  return (
    // main container for the chatbot UI
    // uses Material-UI components for styling and layout
    <Container>
      <Typography variant="h4" align="center" gutterBottom>Dr. AI Chatbot</Typography>
      {/* Button to clear chat history */}
      <Button
      variant = "contained"
      onClick = {clearHistory}>Clear History</Button>
      {/* Paper component to hold the chat messages */}
      {/* maxHeight and overflow styles to make it scrollable if there are many messages */}
      <Paper style = {{maxHeight: 400, overflow: "auto", padding: 16, marginBottom: 16}}>
        <List>
          {/* map through messages and render each one */}
          {/* ListItemText is used to display the message content */}
          {messages.map((message, index) => (
            <ListItem key = {index}>
              <ListItemText
                // primary text is the role of the message (user or assistant)
                primary = {message.role === "user" ? "You" : "Dr. AI"}
                // secondary text is the content of the message
                secondary = {message.content}
                />
            </ListItem>
          ))}
        </List>
      </Paper>
      <Box display = "flex" gap = {1}>
        {/* TextField for user input */}
        <TextField
          fullWidth
          label = "How are you feeling?"
          variant = "outlined"
          value = {input}
          onChange = {(e) => setInput(e.target.value)}
          // onKeyDown event to handle Enter key press for sending messages
          // prevents the default behavior of submitting a form
          onKeyDown = {(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled = {isLoading}
        />
        {/* Button to send the message */}
        <Button
          variant = "contained"
          color = "primary"
          onClick = {handleSend}
          disabled = {isLoading}
          >Send</Button>
      </Box>
      {isLoading && (
        <Box display = "flex" justifyContent = "center" mt = {2}>
          <CircularProgress />
        </Box>
      )}
      {/* Feedback section */}
      {/* Box component to hold feedback buttons and form */}
      <Box 
        mt = {2} 
        display = "flex" 
        flexDirection = "column"
        alignItems = "center">
        <Typography variant = "body2" color = "textSecondary" gutterBottom>
          Has Dr. AI been helpful?
        </Typography>
        <Box>
          <Button
            variant = "outlined"
            onClick = {() => handleFeedback("positive", "")}
            disabled = {isFeedbackSent || showFeedbackForm}
            size = "small">
            {isFeedbackSent ? "Feedback Sent" : "👍"}
          </Button>
          <Button
            variant = "outlined"
            onClick = {() => setShowFeedbackForm(true)}
            disabled = {showFeedbackForm || isFeedbackSent}
            size = "small">
            {isFeedbackSent ? "Feedback Sent" : "👎"}
          </Button>
        </Box>
        {showFeedbackForm && !isFeedbackSent && (
          <Box mt = {2} gap = {1} display = "flex">
            <TextField
              label = "Tell us more..."
              variant = "outlined"
              multiline
              rows = {4}
              value = {feedback}
              onChange = {(e) => setFeedback(e.target.value)}
              fullWidth>
            </TextField>
            <Button
              variant = "contained"
              size = "small"
              onClick = {() => handleFeedback("negative", feedback)}> Send Feedback</Button>
          </Box>
        )}
      </Box>
    </Container>
  );
}

export default App;
