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
  Switch,
  FormControlLabel,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import axios from 'axios';

// Use relative URL in development (will be proxied) or full URL in production
const API_URL = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_API_URL || 'http://localhost:8000'
  : '';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  timeout: 120000, // 120 seconds timeout
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
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [ragFile, setRagFile] = useState(null);
  const [ragUrl, setRagUrl] = useState('');
  const audioRef = useRef(null);
  const [playingIndex, setPlayingIndex] = useState(null);
  const [audioLoadingIndex, setAudioLoadingIndex] = useState(null);

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      // Try different MIME types in order of preference
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav'
      ];
      
      let selectedMimeType = null;
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }
      
      if (!selectedMimeType) {
        throw new Error('No supported audio format found');
      }
      
      const recorder = new MediaRecorder(stream, { mimeType: selectedMimeType });
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        try {
          const audioBlob = new Blob(chunks, { type: selectedMimeType });
          await handleVoiceInput(audioBlob);
        } catch (error) {
          console.error('Error processing recorded audio:', error);
          setError('Error processing voice input. Please try again.');
        } finally {
          stream.getTracks().forEach(track => track.stop());
        }
      };

      recorder.onerror = (event) => {
        console.error('Recording error:', event.error);
        setError('Recording error. Please try again.');
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      setIsRecording(true);
      setError(null);
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Could not access microphone. Please check permissions.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      try {
        mediaRecorder.stop();
        setIsRecording(false);
      } catch (error) {
        console.error('Error stopping recording:', error);
        setIsRecording(false);
      }
    }
  };

  const handleVoiceInput = async (audioBlob) => {
    try {
      setLoading(true);
      const formData = new FormData();
      
      // Determine file extension based on MIME type
      let fileExtension = 'audio';
      if (audioBlob.type.includes('webm')) {
        fileExtension = 'webm';
      } else if (audioBlob.type.includes('mp4')) {
        fileExtension = 'mp4';
      } else if (audioBlob.type.includes('wav')) {
        fileExtension = 'wav';
      }
      
      formData.append('audio', audioBlob, `recording.${fileExtension}`);

      const response = await api.post('/api/v1/voice/speech-to-text', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.status === 'success') {
        setInput(response.data.text);
        setError(null);
      } else {
        setError('Could not understand audio. Please try again.');
      }
    } catch (error) {
      console.error('Error processing voice input:', error);
      setError('Error processing voice input. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const playAudio = async (text, index) => {
    if (audioRef.current && playingIndex === index && !audioRef.current.paused) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlayingIndex(null);
      return;
    }
    setAudioLoadingIndex(index);
    setPlayingIndex(null);
    try {
      const response = await api.post('/api/v1/voice/text-to-speech', { text });
      if (response.data.status === 'success') {
        const audioData = atob(response.data.audio);
        const audioArray = new Uint8Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          audioArray[i] = audioData.charCodeAt(i);
        }
        const audioBlob = new Blob([audioArray], { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.onended = () => setPlayingIndex(null);
          audioRef.current.onplay = () => {
            setPlayingIndex(index);
            setAudioLoadingIndex(null);
          };
          audioRef.current.play();
        }
      } else {
        setAudioLoadingIndex(null);
      }
    } catch (error) {
      setError('Error playing audio response.');
      setPlayingIndex(null);
      setAudioLoadingIndex(null);
    }
  };

  return (
    <Container maxWidth="md" sx={{ height: '100vh', py: 2, bgcolor: '#f5f5f5' }}>
      <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center',  bgcolor: '#424242'  }}>
          <Typography variant="h5" sx={{ color: 'white' }}>LLM Chatbot</Typography>
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ flex: 1 }}>{message.text}</Typography>
                  {message.sender === 'bot' && (
                    <IconButton
                      size="small"
                      onClick={() => playAudio(message.text, index)}
                      color={playingIndex === index ? "secondary" : "primary"}
                      disabled={audioLoadingIndex !== null && audioLoadingIndex !== index}
                    >
                      {audioLoadingIndex === index ? <CircularProgress size={20} /> : <VolumeUpIcon />}
                    </IconButton>
                  )}
                </Box>
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
            <IconButton
              onClick={isRecording ? stopRecording : startRecording}
              color={isRecording ? "error" : "primary"}
              disabled={loading}
              sx={{
                backgroundColor: isRecording ? 'error.main' : 'transparent',
                color: isRecording ? 'white' : 'primary.main',
                '&:hover': {
                  backgroundColor: isRecording ? 'error.dark' : 'primary.light',
                  color: isRecording ? 'white' : 'primary.dark',
                }
              }}
            >
              {isRecording ? <MicOffIcon /> : <MicIcon />}
            </IconButton>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isRecording ? "Recording... Click microphone to stop" : "Type your message or use voice input..."}
              variant="outlined"
              size="small"
              disabled={loading || isRecording}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleSend}
              disabled={loading || !input.trim() || isRecording}
              endIcon={<SendIcon />}
            >
              Send
            </Button>
          </Box>
          {isRecording && (
            <Typography 
              variant="caption" 
              color="error" 
              sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}
            >
              <MicIcon fontSize="small" />
              Recording... Click the microphone button to stop
            </Typography>
          )}
        </Box>
        
        {/* Hidden audio element for playback */}
        <audio ref={audioRef} style={{ display: 'none' }} />
      </Paper>
    </Container>
  );
}

export default App; 