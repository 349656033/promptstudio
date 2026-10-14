const form = document.getElementById("generate-form");
const promptInput = document.getElementById("prompt");
const output = document.getElementById("output");
const status = document.getElementById("status");
const button = document.getElementById("submit-btn");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const prompt = promptInput.value.trim();
  if (!prompt) {
    status.textContent = "Please enter a prompt first.";
    return;
  }

  button.disabled = true;
  status.textContent = "Generating...";
  output.textContent = "";

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Request failed");
    }

    output.textContent = data.content || "No content returned.";
    status.textContent = "Generated successfully.";
  } catch (error) {
    status.textContent = error.message || "Something went wrong.";
  } finally {
    button.disabled = false;
  }
});
