import React, { useState, useEffect, useRef } from 'react';
// 🚨 THE FIX: Added an extra '../' to go up two folder levels
import apiClient from '../../api/axiosConfig';
import './Chatbot.css';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hi! I am Conscia. Ask me to break down the ethics of any product, or explain our scoring system!' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to the bottom of the chat when a new message appears
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setInput('');
    setIsTyping(true);

    try {
      // Point this to your Node.js route that connects to the Gemini API
      const response = await apiClient.post('/chat', { message: userText });
      
      setMessages(prev => [...prev, { sender: 'bot', text: response.data.reply }]);
    } catch (error) {
      console.error("Chatbot API Error:", error);
      setMessages(prev => [...prev, { 
        sender: 'bot', 
        text: 'I am having trouble connecting to my neural network right now. Please check my backend connection!' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="chatbot-wrapper">
      {/* The Floating Action Button */}
      <button 
        className={`chatbot-fab ${isOpen ? 'open' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? '✕' : '✦'}
      </button>

      {/* The Chat Window */}
      <div className={`chatbot-window ${isOpen ? 'active' : ''}`}>
        
        <div className="chat-header">
          <div>
            <h3 className="chat-title">Conscia Assistant</h3>
            <span className="chat-status">Powered by Gemini AI</span>
          </div>
        </div>

        <div className="chat-body">
          {messages.map((msg, index) => (
            <div key={index} className={`chat-message ${msg.sender}`}>
              {msg.sender === 'bot' && <div className="bot-avatar">✦</div>}
              <div className="chat-bubble">
                {msg.text}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="chat-message bot">
              <div className="bot-avatar">✦</div>
              <div className="chat-bubble typing">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="chat-footer">
          <input 
            type="text" 
            placeholder="Ask about product ethics..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" disabled={!input.trim() || isTyping}>
            ➤
          </button>
        </form>

      </div>
    </div>
  );
};

export default Chatbot;