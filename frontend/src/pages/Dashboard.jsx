
import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Send, File, Link2, FileText, Trash2, Loader2, MessageSquare, AlertCircle, LogOut, User, FileCode, Youtube, Globe, X, CheckCircle } from 'lucide-react';
import { logoutAndClear, selectUser, selectToken } from '../redux/slices/authSlice.js';
import {
  uploadPDF,
  uploadCSV,
  uploadURL,
  uploadTXT,
  deleteSource,
  checkServerStatus,
  selectSources,
  selectSourcesUploading,
  selectUploadError,
  selectServerStatus,
  initializeSources,
} from '../redux/slices/sourcesSlice.js';
import {
  sendMessage,
  addUserMessage,
  initializeChat,
  selectMessages,
  selectChatLoading,
  selectChatError,
} from '../redux/slices/chatSlice.js';

export default function Dashboard() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const token =
    useSelector(selectToken) || localStorage.getItem('token');

  const sources = useSelector(selectSources);
  const messages = useSelector(selectMessages);
  const isUploading = useSelector(selectSourcesUploading);
  const uploadError = useSelector(selectUploadError);
  const serverStatus = useSelector(selectServerStatus);
  const isChatLoading = useSelector(selectChatLoading);
  const chatError = useSelector(selectChatError);

  const [inputMessage, setInputMessage] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const messagesEndRef = useRef(null);
  const pdfInputRef = useRef(null);
  const csvInputRef = useRef(null);
  const txtInputRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user?.id) {
      dispatch(initializeSources(user.id));
      dispatch(initializeChat(user.id));
    }
  }, [user, dispatch]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    dispatch(checkServerStatus());
  }, [dispatch]);

  const handleFileUpload = async (files, type) => {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (type === 'pdf') {
        dispatch(uploadPDF({ file, token }));
      } else if (type === 'csv') {
        dispatch(uploadCSV({ file, token }));
      } else if (type === 'txt') {
        dispatch(uploadTXT({ file, token }));
      }
    }
  };

  const handleLinkSubmit = async (url) => {
    if (!url || !url.trim()) return;
    dispatch(uploadURL({ url, token }));
  };

  const handleRemoveSource = (source) => {
    if (!source) return;
    dispatch(deleteSource({ sourceId: source.id, sourceName: source.name, token }));
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isChatLoading) return;

    if (sources.length === 0) {
      return;
    }

    const currentInput = inputMessage.trim();
    const userMsg = {
      id: Date.now(),
      text: currentInput,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    dispatch(addUserMessage(currentInput));
    setInputMessage('');

    dispatch(sendMessage({
      message: currentInput,
      token,
      history: [...messages, userMsg],
    }));
  };

  const handleLogout = () => {
    dispatch(logoutAndClear());
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'pdf': return <FileText className="w-5 h-5 text-red-500" />;
      case 'csv': return <File className="w-5 h-5 text-green-500" />;
      case 'txt': return <FileCode className="w-5 h-5 text-yellow-500" />;
      case 'link': return <Link2 className="w-5 h-5 text-blue-500" />;
      default: return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const displayError = uploadError || chatError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header  */}
      <div className="bg-black/30 backdrop-blur-xl border-b border-white/10 relative z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">NuroDesk</h1>
                <p className="text-xs text-purple-300">RAG-Powered Knowledge Assistant</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-full border text-sm ${serverStatus === 'online'
                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                : 'bg-red-500/20 text-red-400 border-red-500/30'
                }`}>
                {serverStatus === 'online' ? '● Online' : '● Offline'}
              </div>
              <div className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30 text-sm">
                {sources.length} Sources
              </div>

              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  aria-label="User menu"
                  aria-expanded={showUserMenu}
                  aria-haspopup="true"
                  className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2 transition-all duration-200"
                >
                  <User className="w-5 h-5 text-white" />
                  <span className="text-white text-sm font-medium">{user?.name}</span>
                </button>

                {showUserMenu && (
                  <div role="menu" className="absolute right-0 mt-2 w-48 bg-black/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden z-[100]">
                    <div className="p-3 border-b border-white/10">
                      <p className="text-white text-sm font-medium truncate">{user?.name}</p>
                      <p className="text-gray-400 text-xs truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      role="menuitem"
                      className="w-full px-3 py-2 text-left text-red-400 hover:bg-white/10 transition-colors flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm">Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {displayError && (
        <div className="max-w-7xl mx-auto px-6 py-3 relative z-40">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 text-sm">{displayError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Sources */}
          <div className="lg:col-span-1 relative z-10">
            <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white mb-4">Upload Sources</h2>

                <div className="space-y-3">
                  {/* PDF Upload */}
                  <button
                    onClick={() => pdfInputRef.current?.click()}
                    disabled={isUploading}
                    aria-label="Upload PDF"
                    className="w-full px-4 py-3 bg-gradient-to-r from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 disabled:opacity-50 border border-red-500/30 rounded-xl text-white font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <FileText className="w-5 h-5" />
                    <span>PDF</span>
                  </button>
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={(e) => {
                      handleFileUpload(e.target.files, 'pdf');
                      e.target.value = '';
                    }}
                    className="hidden"
                  />

                  {/* CSV Upload */}
                  <button
                    onClick={() => csvInputRef.current?.click()}
                    disabled={isUploading}
                    aria-label="Upload CSV"
                    className="w-full px-4 py-3 bg-gradient-to-r from-green-500/20 to-green-600/20 hover:from-green-500/30 hover:to-green-600/30 disabled:opacity-50 border border-green-500/30 rounded-xl text-white font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <File className="w-5 h-5" />
                    <span>CSV</span>
                  </button>
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv"
                    multiple
                    onChange={(e) => {
                      handleFileUpload(e.target.files, 'csv');
                      e.target.value = '';
                    }}
                    className="hidden"
                  />

                  {/* TXT Upload */}
                  <button
                    onClick={() => txtInputRef.current?.click()}
                    disabled={isUploading}
                    aria-label="Upload TXT"
                    className="w-full px-4 py-3 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 hover:from-yellow-500/30 hover:to-yellow-600/30 disabled:opacity-50 border border-yellow-500/30 rounded-xl text-white font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <FileCode className="w-5 h-5" />
                    <span>TXT</span>
                  </button>
                  <input
                    ref={txtInputRef}
                    type="file"
                    accept=".txt"
                    multiple
                    onChange={(e) => {
                      handleFileUpload(e.target.files, 'txt');
                      e.target.value = '';
                    }}
                    className="hidden"
                  />

                  {/* Link Upload */}
                  <button
                    onClick={() => setShowLinkModal(true)}
                    disabled={isUploading}
                    aria-label="Upload link"
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30 disabled:opacity-50 border border-blue-500/30 rounded-xl text-white font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Link2 className="w-5 h-5" />
                    <span>LINK</span>
                  </button>
                </div>
              </div>

              <div className="p-6 max-h-96 overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Uploaded Sources</h3>

                {isUploading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                  </div>
                )}

                {sources.length === 0 && !isUploading && (
                  <p className="text-gray-500 text-sm text-center py-8">No sources uploaded yet</p>
                )}

                <div className="space-y-2">
                  {sources.map(source => (
                    <div
                      key={source.id}
                      className="bg-white/5 hover:bg-white/10 rounded-lg p-3 border border-white/10 transition-all duration-200 group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          {getFileIcon(source.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">
                              {source.name}
                            </p>
                            <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
                              {source.size && <span>{formatFileSize(source.size)}</span>}
                              {source.documentCount && (
                                <span>• {source.documentCount} chunks</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveSource(source)}
                          aria-label={`Remove source ${source.name}`}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all duration-200 ml-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Chat */}
          <div className="lg:col-span-2 relative z-10">
            <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl flex flex-col h-[calc(100vh-200px)]">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">
                        Ask me anything
                      </h3>
                      <p className="text-gray-400 text-sm max-w-md">
                        Upload your documents and start asking questions. I'll use RAG to provide accurate answers based on your sources.
                      </p>
                    </div>
                  </div>
                )}

                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.sender === 'user'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : 'bg-white/10 text-white border border-white/10'
                        }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/20">
                          <p className="text-xs text-gray-300 mb-2">Sources:</p>
                          <div className="flex flex-wrap gap-2">
                            {message.sources.filter(Boolean).slice(0, 3).map((source, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-white/10 px-2 py-1 rounded-full"
                              >
                                {source}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 rounded-2xl px-4 py-3 border border-white/10">
                      <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <div className="p-6 border-t border-white/10">
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="ask me anything...."
                    aria-label="Ask a question about your documents"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    disabled={isChatLoading || serverStatus !== 'online'}
                  />
                  <button
                    onClick={handleSendMessage}
                    aria-label="Send message"
                    disabled={isChatLoading || !inputMessage.trim() || serverStatus !== 'online' || sources.length === 0}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-200 flex items-center space-x-2"
                  >
                    <span>ask</span>
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  All copyright reserved @2026. Made with ❤️ by NuroDesk.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Link Upload Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-black/95 border border-white/20 rounded-2xl max-w-lg w-full shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <Link2 className="w-5 h-5 text-blue-400" />
                <span>Upload from Link</span>
              </h3>
              <button
                onClick={() => {
                  setShowLinkModal(false);
                  setLinkInput('');
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Input */}
              <input
                type="url"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="https://example.com or youtube.com/watch?v=..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && linkInput.trim()) {
                    handleLinkSubmit(linkInput.trim());
                    setShowLinkModal(false);
                    setLinkInput('');
                  }
                }}
              />

              {/* YouTube Warning */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                <div className="flex items-start space-x-2">
                  <Youtube className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-200 text-sm font-medium mb-1">
                      YouTube: Captions Only
                    </p>
                    <p className="text-yellow-200/70 text-xs mb-2">
                      Due to detecting Cloud Service as bot by YouTube, downloading videos by yt-dlp is not working but only videos with <span className="bg-black/30 px-1 rounded text-[10px]">[CC]</span> work
                    </p>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5 text-xs text-gray-300">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span>Educational videos, News, Ted Talks, Music Videos</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Website Info */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
                <div className="flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-blue-400" />
                  <p className="text-blue-200 text-sm">
                    <span className="font-medium">Websites:</span> Fully supported ✅
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => {
                    setShowLinkModal(false);
                    setLinkInput('');
                  }}
                  className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (linkInput.trim()) {
                      handleLinkSubmit(linkInput.trim());
                      setShowLinkModal(false);
                      setLinkInput('');
                    }
                  }}
                  disabled={!linkInput.trim() || isUploading}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-all"
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}