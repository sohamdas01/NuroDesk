# NeuroDesk 🧠

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.2-blue?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-success?logo=node.js)
![OpenAI](https://img.shields.io/badge/OpenAI-Integrated-black?logo=openai)
![Qdrant](https://img.shields.io/badge/Qdrant-Vector_DB-red?logo=qdrant)

NeuroDesk is a full-stack, AI-powered document intelligence and chat platform. By leveraging Retrieval-Augmented Generation (RAG), NeuroDesk allows users to upload documents, process media, extract text via OCR, and intuitively query their data through a conversational AI interface.

---

## ✨ Key Features

- **Conversational AI (RAG):** Chat intelligently with your uploaded documents using OpenAI and Langchain.
- **Advanced Document Processing:** Support for PDFs, CSVs, and web scraping (`pdf-parse`, `cheerio`).
- **Media & Transcript Extraction:** Integrated support for processing YouTube videos, audio files, and transcripts (`yt-dlp-exec`, `assemblyai`, `@deepgram/sdk`, `fluent-ffmpeg`).
- **Optical Character Recognition (OCR):** Extract text from images and scanned documents using `tesseract.js` and `pdf-poppler`.
- **Semantic Vector Search:** Lightning-fast context retrieval powered by Qdrant.
- **Secure Authentication:** JWT-based user authentication and route protection.
- **Modern UI:** Highly responsive, sleek user interface built with React 19, Redux Toolkit, and TailwindCSS v4.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **State Management:** [Redux Toolkit](https://redux-toolkit.js.org/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Routing:** React Router v7
- **Icons:** Lucide React

### Backend
- **Server:** Node.js, Express
- **Database:** MongoDB (Mongoose)
- **Vector Database:** Qdrant
- **AI / LLM Orchestration:** Langchain, OpenAI API
- **Processing Tools:** Multer, FFmpeg, Tesseract.js, AssemblyAI

---

## 📂 Project Structure

```text
C:\NeuroDesk_new\
├── backend/                  # Node.js Express server
│   ├── config/               # Database, OpenAI, and Qdrant configurations
│   ├── controllers/          # Route handlers (Auth, Chat, Collections, Uploads)
│   ├── middleware/           # JWT Auth & Error handling
│   ├── models/               # Mongoose schemas (User, etc.)
│   ├── routes/               # Express API routes
│   ├── services/             # Core business logic (RAG, OCR, Documents, Vectors)
│   └── temp.../              # Temporary directories for processing uploads/audio
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # View-level components (Auth, Dashboard)
│   │   ├── redux/            # Redux store and slices
│   │   └── index.css         # Global Tailwind styles
│   └── vite.config.js
├── docker-compose.yml        # Docker configuration for multi-container setup
└── render.yaml               # Render deployment configuration
```
## 🌐 Deployment

NeuroDesk is configured for easy deployment:
- **Backend:** Can be deployed to [Render](https://render.com/) using the included `render.yaml`.
- **Frontend:** Pre-configured for deployment on [Vercel](https://vercel.com/) via `vercel.json`.


---
## 🎥 Demo Video
[▶ Watch Full Demo on Loom](https://www.loom.com/share/4e69b1341efa4afdb92c9026489eb851)

---
## 📄 License

This project is licensed under the MIT License.

