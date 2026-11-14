/*
  SRI Digital Invitations - Baby Shower Fun Zone
  Configure SUPABASE_URL and SUPABASE_ANON_KEY below after creating the project.
  Never put a Supabase service_role key in this file.
*/
const SUPABASE_URL = "https://bedystobmjhluvdvqenx.supabase.co";       // Example: https://your-project.supabase.co
const SUPABASE_ANON_KEY = "sb_publishable_p5Ff4b5_aaKkAT5G1v59xA_NgNHAyWQ";  // Supabase anon/public key only
const API_BASE = SUPABASE_URL ? `${SUPABASE_URL}/rest/v1/rpc/` : "";
const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);
const headers = () => ({
  "Content-Type": "application/json",
  "apikey": SUPABASE_ANON_KEY,
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
});

function setMessage(id, message, isError=false) {
  const el = $(id);
  el.textContent = message;
  el.classList.toggle("error", isError);
}

function getVisitorToken() {
  const key = "sri_fun_zone_visitor";
  let token = localStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID ? crypto.randomUUID() :
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = Math.random()*16|0; return (c==="x"?r:(r&3|8)).toString(16);
      });
    localStorage.setItem(key, token);
  }
  return token;
}

async function rpc(name, body={}) {
  if (!configured) throw new Error("The page is in preview mode. Supabase setup is required to enable submissions.");
  const response = await fetch(API_BASE + name, {
    method: "POST", headers: headers(), body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.message || payload?.hint || "Unable to complete your request. Please try again.");
  return payload;
}

function renderResults(data) {
  const girl = Number(data?.girl_count || 0);
  const boy = Number(data?.boy_count || 0);
  const total = girl + boy;
  $("results-empty").hidden = total > 0;
  $("results-data").hidden = total === 0;
  if (!total) return;
  const gp = Math.round(girl / total * 100);
  const bp = 100 - gp;
  $("girl-percent").textContent = `${gp}%`;
  $("boy-percent").textContent = `${bp}%`;
  $("girl-bar").style.width = `${gp}%`;
  $("boy-bar").style.width = `${bp}%`;
  $("vote-total").textContent = `Based on ${total} ${total === 1 ? "prediction" : "predictions"}`;
}

async function refreshResults() {
  try {
    const data = await rpc("get_prediction_totals");
    renderResults(Array.isArray(data) ? data[0] : data);
  } catch (error) {
    if (!configured) {
      $("results-empty").textContent = "Live results will appear here once the event page is connected.";
    } else {
      $("results-empty").textContent = "Live results are temporarily unavailable. Please refresh shortly.";
    }
  }
}

async function refreshWishes() {
  try {
    const data = await rpc("get_approved_wishes");
    const wall = $("wishes-wall");
    wall.replaceChildren();
    if (!Array.isArray(data) || data.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Be the first to leave a lovely blessing. Approved messages will appear here.";
      wall.appendChild(empty);
      return;
    }
    data.forEach(item => {
      const card = document.createElement("article");
      card.className = "wish-note";
      const message = document.createElement("p");
      message.textContent = item.message;
      const author = document.createElement("small");
      author.textContent = item.guest_name ? `— ${item.guest_name}` : "— With love";
      card.append(message, author);
      wall.appendChild(card);
    });
  } catch (_) {
    $("wishes-wall").innerHTML = '<div class="empty-state">The wishes wall will be available once the page is connected.</div>';
  }
}

$("prediction-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const choice = document.querySelector('input[name="prediction"]:checked');
  if (!choice) return;
  const button = $("vote-button");
  button.disabled = true;
  setMessage("vote-message", "Submitting your prediction...");
  try {
    await rpc("submit_prediction", {
      p_choice: choice.value,
      p_visitor_token: getVisitorToken()
    });
    setMessage("vote-message", "Your prediction has been counted. Thank you for joining the fun!");
    document.querySelectorAll('input[name="prediction"]').forEach(input => input.disabled = true);
    button.textContent = "Prediction submitted ✓";
    await refreshResults();
  } catch (error) {
    setMessage("vote-message", error.message, true);
    button.disabled = false;
  }
});

$("wish-message").addEventListener("input", () => {
  $("char-count").textContent = `${$("wish-message").value.length}/300`;
});

$("wish-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("wish-button");
  button.disabled = true;
  setMessage("wish-message-status", "Sending your wishes...");
  try {
    await rpc("submit_wish", {
      p_guest_name: $("wish-name").value.trim() || null,
      p_message: $("wish-message").value.trim()
    });
    $("wish-form").reset();
    $("char-count").textContent = "0/300";
    setMessage("wish-message-status", "Thank you! Your message has been received and will appear after review.");
  } catch (error) {
    setMessage("wish-message-status", error.message, true);
  } finally {
    button.disabled = false;
  }
});

refreshResults();
refreshWishes();
if (configured) {
  setInterval(refreshResults, 15000);
  setInterval(refreshWishes, 30000);
} else {
  // Local design preview: clearly labelled sample values, not live data.
  renderResults({girl_count: 28, boy_count: 22});
  $("vote-total").textContent = "Preview only · Sample results";
  $("results-empty").hidden = true;
  $("results-data").hidden = false;
}
