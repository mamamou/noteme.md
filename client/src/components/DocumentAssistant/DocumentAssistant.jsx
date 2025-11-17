import React, { useState, useContext, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  Send,
  PlusCircle,
  Edit3,
  Repeat,
  Trash2,
  BookOpen,
} from "react-feather";
import { marked } from "marked";
import Prism from "prismjs";
import { toast } from "react-toastify";
import { NotesContext } from "../../context/NotesContext";
import { wrapWithAIMarker } from "../../utils/sectionMarkers";
import "./DocumentAssistant.scss";

const { GoogleGenerativeAI } = require("@google/generative-ai");
const geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY;

const DocumentAssistant = ({ isOpen, onToggle }) => {
  const { content, setContent } = useContext(NotesContext);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Context editor states
  const [documentType, setDocumentType] = useState("");
  const [tone, setTone] = useState("");
  const [audience, setAudience] = useState("");
  const [tableOfContents, setTableOfContents] = useState("");
  const [keyPoints, setKeyPoints] = useState("");

  // Chat states
  const [chatHistory, setChatHistory] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingResponse, setEditingResponse] = useState(null);
  const [editedText, setEditedText] = useState("");

  const chatContainerRef = useRef(null);

  // Build context for AI
  const buildContext = () => {
    let contextText = "";
    if (documentType) contextText += `Document Type: ${documentType}\n`;
    if (tone) contextText += `Tone: ${tone}\n`;
    if (audience) contextText += `Target Audience: ${audience}\n\n`;
    if (tableOfContents)
      contextText += `## Table of Contents\n${tableOfContents}\n\n`;
    if (keyPoints) contextText += `## Key Points\n${keyPoints}\n\n`;
    return contextText;
  };

  // Send message to AI
  const handleSendMessage = async () => {
    if (!currentMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }

    const userMessage = {
      role: "user",
      content: currentMessage,
      timestamp: new Date().toISOString(),
    };

    setChatHistory((prev) => [...prev, userMessage]);
    setCurrentMessage("");
    setLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const contextPrompt = buildContext();
      const fullPrompt = `${contextPrompt}\n\nCurrent document content:\n${content}\n\nUser request: ${currentMessage}\n\nPlease respond in markdown format. Generate content that maintains consistency with the provided context and existing content.`;

      const result = await model.generateContentStream(fullPrompt);
      let aiResponse = "";

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        aiResponse += chunkText;
      }

      const assistantMessage = {
        role: "assistant",
        content: aiResponse,
        timestamp: new Date().toISOString(),
      };

      setChatHistory((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error generating content:", error);
      toast.error("Failed to generate content. Please check your API key.");
      const errorMessage = {
        role: "assistant",
        content: `**Error:** ${error.message || error.toString()}`,
        timestamp: new Date().toISOString(),
      };
      setChatHistory((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Quick action: Append to note
  const handleAppend = (messageContent) => {
    const markedContent = wrapWithAIMarker(messageContent);
    setContent(`${content}${markedContent}`);
    toast.success("Content appended to note with AI marker");
  };

  // Quick action: Replace entire note
  const handleReplace = (messageContent) => {
    setContent(messageContent);
    toast.success("Note content replaced");
  };

  // Quick action: Edit then append
  const handleEditStart = (index, messageContent) => {
    setEditingResponse(index);
    setEditedText(messageContent);
  };

  const handleEditSave = (index) => {
    const updatedHistory = [...chatHistory];
    updatedHistory[index].content = editedText;
    setChatHistory(updatedHistory);
    setEditingResponse(null);
    toast.success("Response updated");
  };

  const handleEditCancel = () => {
    setEditingResponse(null);
    setEditedText("");
  };

  // Regenerate response
  const handleRegenerate = async (index) => {
    const userMessage = chatHistory
      .slice(0, index)
      .reverse()
      .find((msg) => msg.role === "user");
    if (!userMessage) return;

    setLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const contextPrompt = buildContext();
      const fullPrompt = `${contextPrompt}\n\nCurrent document content:\n${content}\n\nUser request: ${userMessage.content}\n\nPlease respond in markdown format. Generate content that maintains consistency with the provided context and existing content.`;

      const result = await model.generateContentStream(fullPrompt);
      let aiResponse = "";

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        aiResponse += chunkText;
      }

      const updatedHistory = [...chatHistory];
      updatedHistory[index] = {
        ...updatedHistory[index],
        content: aiResponse,
        timestamp: new Date().toISOString(),
      };
      setChatHistory(updatedHistory);
      toast.success("Response regenerated");
    } catch (error) {
      console.error("Error regenerating content:", error);
      toast.error("Failed to regenerate content");
    } finally {
      setLoading(false);
    }
  };

  // Delete message
  const handleDeleteMessage = (index) => {
    setChatHistory((prev) => prev.filter((_, i) => i !== index));
    toast.success("Message deleted");
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Highlight code blocks
  useEffect(() => {
    Prism.highlightAll();
  }, [chatHistory]);

  if (!isOpen) return null;

  return (
    <motion.div
      className={`document-assistant ${isCollapsed ? "collapsed" : ""}`}
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ duration: 0.3 }}
    >
      <div className="assistant-header">
        <div className="header-left">
          <BookOpen size={20} />
          <h3>Document Assistant</h3>
        </div>
        <div className="header-actions">
          <button
            className="collapse-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? <ChevronLeft /> : <ChevronRight />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="assistant-content">
          {/* Context Editor Section */}
          <div className="context-editor">
            <h4>Document Context</h4>
            <div className="context-field">
              <label>Document Type</label>
              <input
                type="text"
                placeholder="e.g., Essay, Report, Article"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
              />
            </div>
            <div className="context-field">
              <label>Tone</label>
              <input
                type="text"
                placeholder="e.g., Academic, Casual, Technical"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              />
            </div>
            <div className="context-field">
              <label>Target Audience</label>
              <input
                type="text"
                placeholder="e.g., Researchers, Students, General Public"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              />
            </div>
            <div className="context-field">
              <label>Table of Contents</label>
              <textarea
                placeholder="1. Introduction&#10;2. Main Point A&#10;3. Main Point B&#10;..."
                value={tableOfContents}
                onChange={(e) => setTableOfContents(e.target.value)}
                rows={6}
              />
            </div>
            <div className="context-field">
              <label>Key Consistency Points</label>
              <textarea
                placeholder="- Terminology to use&#10;- Important themes&#10;- Style guidelines"
                value={keyPoints}
                onChange={(e) => setKeyPoints(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          {/* Chat Interface Section */}
          <div className="chat-section">
            <h4>Section Generator</h4>
            <div className="chat-container" ref={chatContainerRef}>
              {chatHistory.length === 0 && (
                <div className="empty-state">
                  <p>
                    Enter a request like "write section 1" or "expand on
                    introduction"
                  </p>
                </div>
              )}
              {chatHistory.map((message, index) => (
                <div key={index} className={`message ${message.role}`}>
                  {message.role === "user" ? (
                    <div className="message-content">
                      <strong>You:</strong>
                      <p>{message.content}</p>
                    </div>
                  ) : (
                    <div className="assistant-message">
                      {editingResponse === index ? (
                        <div className="edit-mode">
                          <textarea
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            rows={10}
                          />
                          <div className="edit-actions">
                            <button
                              className="save-btn"
                              onClick={() => handleEditSave(index)}
                            >
                              Save
                            </button>
                            <button
                              className="cancel-btn"
                              onClick={handleEditCancel}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div
                            className="message-content"
                            dangerouslySetInnerHTML={{
                              __html: marked.parse(message.content, {
                                gfm: true,
                                breaks: true,
                              }),
                            }}
                          />
                          <div className="message-actions">
                            <button
                              className="action-btn"
                              onClick={() => handleAppend(message.content)}
                              title="Append to note"
                            >
                              <PlusCircle size={16} />
                            </button>
                            <button
                              className="action-btn"
                              onClick={() => handleReplace(message.content)}
                              title="Replace note content"
                            >
                              <Repeat size={16} />
                            </button>
                            <button
                              className="action-btn"
                              onClick={() =>
                                handleEditStart(index, message.content)
                              }
                              title="Edit"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              className="action-btn"
                              onClick={() => handleRegenerate(index)}
                              title="Regenerate"
                            >
                              <Repeat size={16} />
                            </button>
                            <button
                              className="action-btn delete"
                              onClick={() => handleDeleteMessage(index)}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="message assistant">
                  <div className="message-content loading">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="chat-input">
              <textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="E.g., 'write section 3' or 'expand the introduction'"
                rows={3}
              />
              <button
                className="send-btn"
                onClick={handleSendMessage}
                disabled={loading || !currentMessage.trim()}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DocumentAssistant;
