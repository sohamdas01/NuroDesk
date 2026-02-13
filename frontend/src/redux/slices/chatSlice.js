
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_URL = import.meta.env.VITE_API_URL ;

const loadMessagesFromStorage = () => {
  try {
    const messages = localStorage.getItem('chatMessages');
    return messages ? JSON.parse(messages) : [];
  } catch (error) {
    console.error('Error loading messages from storage:', error);
    return [];
  }
};

const initialState = {
  messages: loadMessagesFromStorage(),
  loading: false,
  error: null,
};

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ message, token, history }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          history: history.map(m => ({
            role: m.sender,
            content: m.text
          }))
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message || 'Failed to send message');
      }

      const data = await response.json();

      return {
        id: Date.now() + 1,
        text: data.answer,
        sender: 'ai',
        timestamp: new Date().toISOString(),
        // sources: data.sources.map(s =>
        //   s.metadata.filename || s.metadata.url || s.metadata.source
        sources: data.sources.map(s => s.name)
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addUserMessage: (state, action) => {
      const userMessage = {
        id: Date.now(),
        text: action.payload,
        sender: 'user',
        timestamp: new Date().toISOString(),
      };
      state.messages.push(userMessage);
      localStorage.setItem('chatMessages', JSON.stringify(state.messages));
    },
    clearMessages: (state) => {
      state.messages = [];
      localStorage.removeItem('chatMessages');
    },
    clearChatError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading = false;
        state.messages.push(action.payload);
        localStorage.setItem('chatMessages', JSON.stringify(state.messages));
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;

        const last = state.messages[state.messages.length - 1];
        if (last?.sender === 'user') {
          state.messages.pop();
        }

        localStorage.setItem('chatMessages', JSON.stringify(state.messages));
      });
  },
});

export const { addUserMessage, clearMessages, clearChatError } = chatSlice.actions;

export const selectMessages = (state) => state.chat.messages;
export const selectChatLoading = (state) => state.chat.loading;
export const selectChatError = (state) => state.chat.error;

export default chatSlice.reducer;