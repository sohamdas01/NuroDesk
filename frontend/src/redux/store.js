
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice.js';
import sourcesReducer from './slices/sourcesSlice.js'; 
import chatReducer from './slices/chatSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    sources: sourcesReducer,
    chat: chatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
