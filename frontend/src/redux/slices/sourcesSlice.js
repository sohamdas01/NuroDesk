
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_URL = import.meta.env.VITE_API_URL ;

function getStorageKey(userId, key) {
  return userId ? `user_${userId}_${key}` : key;
}

const loadSourcesFromStorage = (userId) => {
  if (!userId) return [];
  try {
    const key = getStorageKey(userId, 'sources');
    const sources = localStorage.getItem(key);
    return sources ? JSON.parse(sources) : [];
  } catch (error) {
    console.error('Error loading sources from storage:', error);
    return [];
  }
};

const initialState = {
  items: [],
  uploading: false,
  uploadError: null,
  serverStatus: 'checking',
  currentUserId: null,
};

//  Upload PDF
export const uploadPDF = createAsyncThunk(
  'sources/uploadPDF',
  async ({ file, token }, { rejectWithValue }) => {
    try {
      if (!token) return rejectWithValue('No authentication token available');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/upload/pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message || 'Failed to upload PDF');
      }

      const data = await response.json();
      return {
        id: Date.now() + Math.random(),
        name: file.name,
        type: 'pdf',
        size: file.size,
        uploadedAt: new Date().toISOString(),
        documentCount: data.documentCount,
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

//  Upload CSV
export const uploadCSV = createAsyncThunk(
  'sources/uploadCSV',
  async ({ file, token }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/upload/csv`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message || 'Failed to upload CSV');
      }

      const data = await response.json();
      return {
        id: Date.now() + Math.random(),
        name: file.name,
        type: 'csv',
        size: file.size,
        uploadedAt: new Date().toISOString(),
        documentCount: data.documentCount,
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

// Upload TXT 
export const uploadTXT = createAsyncThunk(
  'sources/uploadTXT',
  async ({ file, token }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/upload/txt`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message || 'Failed to upload TXT');
      }

      const data = await response.json();
      return {
        id: Date.now() + Math.random(),
        name: file.name,
        type: 'txt',
        size: file.size,
        uploadedAt: new Date().toISOString(),
        documentCount: data.documentCount,
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

// //  Upload URL
// export const uploadURL = createAsyncThunk(
//   'sources/uploadURL',
//   async ({ url, token }, { rejectWithValue }) => {
//     try {
//       const response = await fetch(`${API_URL}/upload/url`, {
//         method: 'POST',
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ url }),
//       });
export const uploadURL = createAsyncThunk(
  'sources/uploadURL',
  async ({ url, token }, { rejectWithValue }) => {
    try {
      if (!token) {
        return rejectWithValue('Authentication token missing');
      }

      const response = await fetch(`${API_URL}/upload/url`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message || 'Failed to process URL');
      }

      const data = await response.json();
      return {
        id: Date.now(),
        name: url,
        type: 'link',
        uploadedAt: new Date().toISOString(),
        documentCount: data.documentCount,
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

//  Server health check
export const checkServerStatus = createAsyncThunk(
  'sources/checkServerStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL.replace('/api', '')}/api/health`);
      if (!response.ok) throw new Error('Server offline');
      return 'online';
    } catch {
      return rejectWithValue('offline');
    }
  }
);

const sourcesSlice = createSlice({
  name: 'sources',
  initialState,
  reducers: {
    initializeSources: (state, action) => {
      const userId = action.payload;
      state.currentUserId = userId;
      state.items = loadSourcesFromStorage(userId);
    },
    removeSource: (state, action) => {
      state.items = state.items.filter((s) => s.id !== action.payload);
      if (state.currentUserId) {
        const key = getStorageKey(state.currentUserId, 'sources');
        localStorage.setItem(key, JSON.stringify(state.items));
      }
    },
    clearSources: (state) => {
      state.items = [];
      if (state.currentUserId) {
        const key = getStorageKey(state.currentUserId, 'sources');
        localStorage.removeItem(key);
      }
    },
    clearUploadError: (state) => {
      state.uploadError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // PDF
      .addCase(uploadPDF.pending, (state) => {
        state.uploading = true;
        state.uploadError = null;
      })
      .addCase(uploadPDF.fulfilled, (state, action) => {
        state.uploading = false;
        state.items.push(action.payload);
        if (state.currentUserId) {
          const key = getStorageKey(state.currentUserId, 'sources');
          localStorage.setItem(key, JSON.stringify(state.items));
        }
      })
      .addCase(uploadPDF.rejected, (state, action) => {
        state.uploading = false;
        state.uploadError = action.payload;
      })
      // CSV
      .addCase(uploadCSV.pending, (state) => {
        state.uploading = true;
        state.uploadError = null;
      })
      .addCase(uploadCSV.fulfilled, (state, action) => {
        state.uploading = false;
        state.items.push(action.payload);
        if (state.currentUserId) {
          const key = getStorageKey(state.currentUserId, 'sources');
          localStorage.setItem(key, JSON.stringify(state.items));
        }
      })
      .addCase(uploadCSV.rejected, (state, action) => {
        state.uploading = false;
        state.uploadError = action.payload;
      })
      // TXT (new)
      .addCase(uploadTXT.pending, (state) => {
        state.uploading = true;
        state.uploadError = null;
      })
      .addCase(uploadTXT.fulfilled, (state, action) => {
        state.uploading = false;
        state.items.push(action.payload);
        if (state.currentUserId) {
          const key = getStorageKey(state.currentUserId, 'sources');
          localStorage.setItem(key, JSON.stringify(state.items));
        }
      })
      .addCase(uploadTXT.rejected, (state, action) => {
        state.uploading = false;
        state.uploadError = action.payload;
      })
      // URL
      .addCase(uploadURL.pending, (state) => {
        state.uploading = true;
        state.uploadError = null;
      })
      .addCase(uploadURL.fulfilled, (state, action) => {
        state.uploading = false;
        state.items.push(action.payload);
        if (state.currentUserId) {
          const key = getStorageKey(state.currentUserId, 'sources');
          localStorage.setItem(key, JSON.stringify(state.items));
        }
      })
      .addCase(uploadURL.rejected, (state, action) => {
        state.uploading = false;
        state.uploadError = action.payload;
      })
      // Server status
      .addCase(checkServerStatus.fulfilled, (state, action) => {
        state.serverStatus = action.payload;
      })
      .addCase(checkServerStatus.rejected, (state, action) => {
        state.serverStatus = action.payload;
      });
  },
});

export const {
  removeSource,
  clearSources,
  clearUploadError,
  initializeSources,
} = sourcesSlice.actions;

export const selectSources = (state) => state.sources.items;
export const selectSourcesUploading = (state) => state.sources.uploading;
export const selectUploadError = (state) => state.sources.uploadError;
export const selectServerStatus = (state) => state.sources.serverStatus;

export default sourcesSlice.reducer;