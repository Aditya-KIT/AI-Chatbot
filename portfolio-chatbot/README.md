# Portfolio AI Chatbot

A full-stack, RAG-powered AI chatbot designed to be embedded in your React portfolio website. It answers questions from recruiters about your skills, experience, and projects using your resume and FAQ PDFs as data sources.

## Tech Stack
- **Frontend**: React (ChatWidget.jsx)
- **Backend**: Python FastAPI
- **LLM**: Google Gemini (`gemini-2.5-flash`)
- **Vector DB**: Pinecone
- **Embeddings**: Google `text-embedding-004`
- **PDF Extraction**: PyMuPDF (`fitz`)

---

## Setup Instructions

### 1. Prerequisites
Ensure you have the following installed:
- Python 3.9+
- Node.js (for your React frontend)
- API Keys for Google Gemini and Pinecone.

### 2. Backend Environment Variables
Navigate to the `backend` folder and create a `.env` file (you can use `.env.example` as a template):
```env
GEMINI_API_KEY=your_gemini_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=portfolio-bot
```

### 3. Install Backend Dependencies
In the `backend` folder, run:
```bash
pip install -r requirements.txt
```

### 4. Provide Your Data
Place your PDF files in the `backend/data/` folder. Ensure the files are named exactly:
- `resume.pdf`
- `faq.pdf`

### 5. Update Placeholders
Open `backend/main.py` and replace the placeholders `[MY NAME]` and `[MY EMAIL]` in the `SYSTEM_PROMPT` variable with your actual name and email address. Also, ensure you replace `[MY NAME]` in `frontend/components/ChatWidget.jsx`.

---

## How to Run the Ingestion Script (ingest.py)

The ingestion script reads your PDFs, chunks the text, creates embeddings, and uploads them to your Pinecone index.

1. Navigate to the `backend` folder.
2. Run the script:
   ```bash
   python ingest.py
   ```
3. You should see output similar to this:
   ```text
   Reading resume.pdf... 12 chunks created
   Uploading to Pinecone... Done!
   Reading faq.pdf... 8 chunks created
   Uploading to Pinecone... Done!
   Total vectors: 20
   ```
*Note: You only need to run this script once, or whenever you update your PDFs. It uses `upsert`, meaning it will safely overwrite existing chunks without duplicating them.*

---

## How to Start the Backend

To start the FastAPI server that handles chat requests:

1. Navigate to the `backend` folder.
2. Start the server using uvicorn:
   ```bash
   uvicorn main:app --reload
   ```
3. The server will start on `http://localhost:8000`.
   - The main chat endpoint will be available at `POST http://localhost:8000/chat`.
   - A health check is available at `GET http://localhost:8000/health`.

---

## How to Add ChatWidget to Your React App

The `ChatWidget.jsx` component is a drop-in React component that doesn't rely on external UI libraries.

1. Copy `frontend/components/ChatWidget.jsx` into your React project's `src/components/` folder.
2. In your main App file (e.g., `App.jsx` or `App.tsx`), import and render the component:
   ```jsx
   import ChatWidget from './components/ChatWidget';

   function App() {
     return (
       <div>
         {/* Your existing portfolio content */}
         <h1>My Portfolio</h1>
         
         {/* Drop in the ChatWidget anywhere, it uses fixed positioning */}
         <ChatWidget />
       </div>
     );
   }

   export default App;
   ```
3. Ensure your React app can communicate with the backend. By default, the widget attempts to call `http://localhost:8000/chat`. If your backend is deployed elsewhere, create a `.env` file in your React app root and add:
   ```env
   VITE_API_URL=https://your-production-backend-url.com
   ```

---

## Common Errors and Fixes

### 1. `ModuleNotFoundError: No module named '...'`
**Fix**: Ensure you have activated your virtual environment (if using one) and installed all requirements: `pip install -r requirements.txt`.

### 2. `PineconeException: Unauthorized`
**Fix**: Verify your `PINECONE_API_KEY` in the `.env` file is correct and that the Pinecone index exists or can be created using your API key's permissions.

### 3. `Google API Error: API key not valid.`
**Fix**: Check your `GEMINI_API_KEY` in `.env`. Make sure it's copied exactly from Google AI Studio.

### 4. Fetch / CORS Errors in React Console
**Fix**: If you get a CORS error when the widget tries to send a message, ensure the backend is running. The current `main.py` has CORS fully open (`allow_origins=["*"]`) for local development. If deploying to production, ensure you add your frontend's deployed URL to the `allow_origins` array.

### 5. "I don't know the answer to that" for everything
**Fix**: This usually means the RAG retrieval (`rag.py`) isn't finding relevant chunks.
- Did you run `ingest.py`?
- Are your PDFs in the correct folder (`backend/data/`) and contain readable text?
- Check the Pinecone dashboard to see if vectors were actually uploaded to the index.
