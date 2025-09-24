// script.js
const storyContainer = document.getElementById('story-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

sendButton.addEventListener('click', async () => {
  const userText = userInput.value;
  if (!userText) return; // Don't do anything if the input is empty

  // 1. Display the user's text and a "thinking" message
  storyContainer.innerHTML += `<p class="user-text"><strong>You:</strong> ${userText}</p>`;
  userInput.value = ''; // Clear the input box
  sendButton.disabled = true; // Prevent multiple clicks while waiting
  storyContainer.innerHTML += `<p class="ai-text" id="thinking"><strong>Narrator:</strong> Thinking...</p>`;
  storyContainer.scrollTop = storyContainer.scrollHeight; // Scroll to the bottom

  // 2. Send the user's text to our backend function
  try {
    const response = await fetch('/.netlify/functions/get-ai-response', {
      method: 'POST',
      body: JSON.stringify({ userInput: userText }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const aiReply = data.reply;
    
    // 3. Replace "Thinking..." with the real AI reply
    const thinkingP = document.getElementById('thinking');
    thinkingP.innerHTML = `<strong>Narrator:</strong> ${aiReply}`;
    thinkingP.removeAttribute('id'); // Remove id to avoid duplicates

  } catch (error) {
    const thinkingP = document.getElementById('thinking');
    thinkingP.textContent = "Sorry, there was an error connecting to the storyteller.";
    console.error('Fetch error:', error);
  } finally {
    sendButton.disabled = false; // Re-enable the button
    storyContainer.scrollTop = storyContainer.scrollHeight; // Scroll to the bottom again
  }
});