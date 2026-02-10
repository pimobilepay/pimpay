const sendMessageToElara = async (userText) => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message: userText }),
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await response.json();
  setMessages([...messages, { text: data.reply, sender: 'Elara' }]);
};
