import { auth, authPreparado } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
await authPreparado.catch(console.error);
onAuthStateChanged(auth, (user) => {
  if (!user) window.location.replace("index.html");
});
