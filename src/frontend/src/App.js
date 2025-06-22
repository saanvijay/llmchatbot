import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Container,
  TextField,
  Button,
  Paper,
  Typography,
  CircularProgress,
  IconButton,
  Alert,
  Stack,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import axios from 'axios';

// Use relative URL in development (will be proxied) or full URL in production
const API_URL = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_API_URL || 'http://localhost:8000'
  : '';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  }
});

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [ragFile, setRagFile] = useState(null);
  const [ragUrl, setRagUrl] = useState('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessage = { text: input, sender: 'user' };
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    // Generate idempotency key based on question and session
    const idempotencyKey = `${sessionId || 'anonymous'}-${Date.now()}-${input.trim().toLowerCase().replace(/\s+/g, '-')}`;

    try {
      const response = await api.post('/api/v1/chat', {
        question: input
      }, {
        headers: {
          ...(sessionId && { 'X-Session-ID': sessionId }),
          'X-Idempotency-Key': idempotencyKey
        }
      });

      if (response.data.status === 'success') {
        const botResponse = response.data.data.answer;
        setMessages(prev => [...prev, {
          text: botResponse,
          sender: 'bot'
        }]);
        
        // Append new Q&A pair to existing context
        const newQAPair = `User: ${input}\nAI: ${botResponse}\n`;
        setContext(context => context ? context + newQAPair : newQAPair);
        setSessionId(response.data.data.session_id);
      } else {
        throw new Error(response.data.message || 'Failed to get response');
      }
    } catch (error) {
      console.error('API Error:', error);
      let errorMessage = 'Failed to connect to the server. Please try again.';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMessage = error.response.data?.message || error.response.statusText;
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'No response from server. Please check your connection.';
      }
      
      setError(errorMessage);
      setMessages(prev => [...prev, {
        text: `Error: ${errorMessage}`,
        sender: 'error'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearContext = async () => {
    if (!sessionId) return;

    try {
      await api.delete('/api/v1/context', {
        headers: { 'X-Session-ID': sessionId }
      });
      setContext('');
      setSessionId(null);
      setMessages([]);
      setError(null);
    } catch (error) {
      console.error('Error clearing context:', error);
      setError('Failed to clear context. Please try again.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRagFileChange = (event) => {
    const file = event.target.files[0];
    if (file && [
      'text/csv',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ].includes(file.type)) {
      setRagFile(file);
      setError(null);
    } else {
      setError('Please select a valid CSV, PDF, or DOC/DOCX file');
      setRagFile(null);
    }
  };

  const handleRagUpload = async () => {
    if (!ragFile && !ragUrl) {
      setError('Please select a file or enter a URL');
      return;
    }

    setUploading(true);
    setError(null);
    
    try {
      let response;
      if (ragFile) {
        const formData = new FormData();
        formData.append('file', ragFile);
        response = await api.post('/api/v1/rag', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else if (ragUrl) {
        response = await api.post('/api/v1/rag', {
          url: ragUrl,
        });
      }

      if (response.data.status === 'success') {
        setError(null);
        setMessages(prev => [...prev, {
          text: `RAG data uploaded successfully.`,
          sender: 'bot'
        }]);
        setRagFile(null);
        setRagUrl('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        throw new Error(response.data.message || 'Failed to upload');
      }
    } catch (error) {
      let errorMessage = 'Failed to upload. Please try again.';
      if (error.response) errorMessage = error.response.data?.message || error.response.statusText;
      else if (error.request) errorMessage = 'No response from server. Please check your connection.';
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ height: '100vh', py: 2, bgcolor: '#f5f5f5' }}>
      <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center',  bgcolor: '#f5f5f5'  }}>
          <Typography variant="h5">LLM Chatbot</Typography>
          {sessionId && (
            <IconButton onClick={handleClearContext} color="error" title="Clear Context">
              <DeleteIcon />
            </IconButton>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mx: 2, mt: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFileIcon />}
              disabled={uploading}
            >
              Choose File
              <input
                type="file"
                hidden
                accept=".csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                onChange={handleRagFileChange}
                ref={fileInputRef}
              />
            </Button>
            <TextField
              label="or Enter URL"
              value={ragUrl}
              onChange={e => setRagUrl(e.target.value)}
              disabled={uploading}
              sx={{ minWidth: 200 }}
            />
            <Button
              variant="contained"
              onClick={handleRagUpload}
              disabled={uploading || (!ragFile && !ragUrl)}
              startIcon={uploading ? <CircularProgress size={20} /> : <UploadFileIcon />}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </Stack>
          {(ragFile && (
            <Typography variant="body2" sx={{ flex: 1 }}>
              Selected: {ragFile.name}
            </Typography>
          ))}
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {messages.map((message, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                mb: 2
              }}
            >
              <Paper
                elevation={1}
                sx={{
                  p: 2,
                  maxWidth: '70%',
                  backgroundColor: message.sender === 'user' 
                    ? 'primary.light' 
                    : message.sender === 'error'
                      ? 'error.light'
                      : 'grey.100',
                  color: message.sender === 'user' ? 'white' : 'text.primary'
                }}
              >
                <Typography>{message.text}</Typography>
              </Paper>
            </Box>
          ))}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>

        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              variant="outlined"
              size="small"
              disabled={loading}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              endIcon={<SendIcon />}
            >
              Send
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}

export default App; 