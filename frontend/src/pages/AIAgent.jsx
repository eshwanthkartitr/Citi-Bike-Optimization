import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User } from 'lucide-react'

export default function AIAgent() {
  const [messages, setMessages] = useState([
    {
      role: 'agent',
      content: "Hello! I'm your AI Operations Assistant. I can help you optimize your Citi-Bike rebalancing strategy, explain decisions, and suggest improvements. How can I assist you today?",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages([...messages, userMessage])
    setInput('')
    setLoading(true)

    try {
      // TODO: Call API
      // const response = await fetch('/api/agent/query', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ query: input })
      // })
      // const data = await response.json()
      
      // Mock response
      setTimeout(() => {
        const agentMessage = {
          role: 'agent',
          content: "Based on your current configuration, I recommend adjusting the shortage penalty to better balance cost and service quality. Would you like me to explain the trade-offs in detail?",
          timestamp: new Date()
        }
        setMessages(prev => [...prev, agentMessage])
        setLoading(false)
      }, 1000)
      
    } catch (error) {
      console.error('Agent query failed:', error)
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">AI Operations Agent</h2>
        <p className="mt-2 text-gray-600">
          Get intelligent guidance and explanations for your optimization decisions
        </p>
      </div>

      <div className="card h-[600px] flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex-shrink-0 ${message.role === 'user' ? 'ml-3' : 'mr-3'}`}>
                  {message.role === 'agent' ? (
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <Bot className="h-6 w-6 text-primary-600" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-600" />
                    </div>
                  )}
                </div>
                <div>
                  <div className={`rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-start">
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                  <Bot className="h-6 w-6 text-primary-600" />
                </div>
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex items-end gap-3 border-t pt-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your optimization strategy..."
            rows={3}
            className="input flex-1 resize-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="btn-primary px-6 py-3"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setInput("How can I reduce operational costs?")}
          className="card text-left hover:shadow-lg transition-shadow cursor-pointer"
        >
          <h4 className="font-semibold mb-2">💰 Reduce Costs</h4>
          <p className="text-sm text-gray-600">Get suggestions for cost optimization</p>
        </button>
        <button
          onClick={() => setInput("How can I improve fairness to remote stations?")}
          className="card text-left hover:shadow-lg transition-shadow cursor-pointer"
        >
          <h4 className="font-semibold mb-2">⚖️ Improve Fairness</h4>
          <p className="text-sm text-gray-600">Balance service across all stations</p>
        </button>
        <button
          onClick={() => setInput("Explain the last optimization result")}
          className="card text-left hover:shadow-lg transition-shadow cursor-pointer"
        >
          <h4 className="font-semibold mb-2">🔍 Explain Results</h4>
          <p className="text-sm text-gray-600">Understand optimization decisions</p>
        </button>
      </div>
    </div>
  )
}
