'use client'
import Image from "next/image";
import { useState } from "react";
import { Box, Button, Input } from "@chakra-ui/react";
import { Stack } from "@chakra-ui/react";
import { TextField } from "@mui/material";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm the Rate My Professor assistant. How can I help you today?",
    },
  ]);

  const [message, setMessage] = useState("");

  const sendMessage = async () => {
    if (!message) return;

    setMessages((messages) => [
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);

    setMessage("");

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([...messages, { role: "user", content: message }]),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = "";

    return reader.read().then(function processText({ done, value }) {
      if (done) {
        setMessages((messages) => [
          ...messages.slice(0, -1),
          { role: "assistant", content: result },
        ]);
        return result;
      }
      const text = decoder.decode(value || new Uint8Array(), { stream: true });
      setMessages((messages) => {
        let lastMessage = messages[messages.length - 1];
        let otherMessages = messages.slice(0, messages.length - 1);
        return [
          ...otherMessages,
          { ...lastMessage, content: lastMessage.content + text },
        ];
      });
      return reader.read().then(processText);
    });
  };

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      backgroundColor="#f5f5f5"
    >
      <Stack
        direction="column"
        width="400px"
        height="600px"
        borderRadius="10px"
        boxShadow="lg"
        overflow="hidden"
        backgroundColor="white"
      >
        <Stack
          direction="column"
          spacing={3}
          flexGrow={1}
          overflow="auto"
          padding={4}
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              display="flex"
              justifyContent={
                message.role === 'assistant' ? 'flex-start' : 'flex-end'
              }
            >
              <Box
                maxWidth="70%"
                backgroundColor={
                  message.role === 'assistant' ? '#0070f3' : '#9c27b0'
                }
                color="white"
                borderRadius="20px"
                padding="10px 20px"
                marginBottom="10px"
                boxShadow="sm"
              >
                {message.content}
              </Box>
            </Box>
          ))}
        </Stack>
        <Box padding={2} borderTop="1px solid #ccc">
          <Stack direction="row" spacing={2}>
            <TextField
              label="Type a message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              variant="outlined"
              fullWidth
            />
            <Button
              variant="contained"
              color="primary"
              onClick={sendMessage}
              style={{ borderRadius: '20px' }}
            >
              Send
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
