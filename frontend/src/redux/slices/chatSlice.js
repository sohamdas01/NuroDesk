
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API_URL from '../../utils/api.js';

function getChatStorageKey(userId) {
  return userId ? `user_${userId}_chatMessages` : 'chatMessages';
}

const loadMessagesFromStorage = (userId) => {
  try {
    const key = getChatStorageKey(userId);
    const messages = localStorage.getItem(key) || (!userId ? localStorage.getItem('chatMessages') : null);
    return messages ? JSON.parse(messages) : [];
  } catch (error) {
    console.error('Error loading messages from storage:', error);
    return [];
  }
};

const initialState = {
  messages: [],
  loading: false,
  error: null,
  currentUserId: null,
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
        sources: (data.sources || []).map(s => s?.name || s)
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
    initializeChat: (state, action) => {
      const userId = action.payload;
      state.currentUserId = userId;
      state.messages = loadMessagesFromStorage(userId);
    },
    addUserMessage: (state, action) => {
      const userMessage = {
        id: Date.now(),
        text: action.payload,
        sender: 'user',
        timestamp: new Date().toISOString(),
      };
      state.messages.push(userMessage);
      const key = getChatStorageKey(state.currentUserId);
      localStorage.setItem(key, JSON.stringify(state.messages));
    },
    clearMessages: (state) => {
      state.messages = [];
      const key = getChatStorageKey(state.currentUserId);
      localStorage.removeItem(key);
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
        const key = getChatStorageKey(state.currentUserId);
        localStorage.setItem(key, JSON.stringify(state.messages));
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to send message';

        state.messages.push({
          id: Date.now() + 1,
          text: 'Sorry, I encountered an error while processing your request. Please try again.',
          sender: 'ai',
          isError: true,
          timestamp: new Date().toISOString(),
        });

        const key = getChatStorageKey(state.currentUserId);
        localStorage.setItem(key, JSON.stringify(state.messages));
      });
  },
});

export const { initializeChat, addUserMessage, clearMessages, clearChatError } = chatSlice.actions;

export const selectMessages = (state) => state.chat.messages;
export const selectChatLoading = (state) => state.chat.loading;
export const selectChatError = (state) => state.chat.error;

export default chatSlice.reducer;

// Persistence helper: sync chat messages to localStorage
export const persistChatMessages = () => (dispatch, getState) => {
  const { messages, currentUserId } = getState().chat;
  const key = getChatStorageKey(currentUserId);
  localStorage.setItem(key, JSON.stringify(messages));
};

export const clearMessagesAndPersist = () => (dispatch, getState) => {
  const { currentUserId } = getState().chat;
  dispatch(clearMessages());
  const key = getChatStorageKey(currentUserId);
  localStorage.removeItem(key);
};