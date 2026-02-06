const supabase = supabase.createClient(
  "https://YOUR_URL.supabase.co",
  "YOUR_ANON_KEY"
);

let me = null;
let partner = null;

// 登録
async function register() {
  if (!agree.checked) return alert("利用規約に同意してください");

  await supabase.from("users").insert({
    username: username.value,
    password: password.value
  });

  alert("登録完了");
}

// ログイン
async function login() {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("username", username.value)
    .eq("password", password.value)
    .single();

  if (!data) return alert("ログイン失敗");

  me = data;
  auth.style.display = "none";
  app.style.display = "block";
  myname.innerText = "ユーザー名：" + me.username;

  loadFriends();
  checkQR();
}

// QR表示
function showQR() {
  const url = location.origin + "?add=" + me.id;
  qr.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${url}">`;
}

// QR読み取り（申請）
async function checkQR() {
  const params = new URLSearchParams(location.search);
  const add = params.get("add");
  if (!add) return;

  await supabase.from("friends").insert({
    user1: me.id,
    user2: add,
    status: "pending"
  });

  alert("友達申請を送りました");
}

// 友達＆申請一覧
async function loadFriends() {
  // 申請一覧
  const { data: reqs } = await supabase
    .from("friends")
    .select("*")
    .eq("user2", me.id)
    .eq("status", "pending");

  requests.innerHTML = "";
  for (let r of reqs) {
    const { data:user } = await supabase
      .from("users").select("*").eq("id", r.user1).single();

    const li = document.createElement("li");
    li.innerHTML = `${user.username}
      <button onclick="approve('${r.id}')">承認</button>
      <button onclick="reject('${r.id}')">拒否</button>`;
    requests.appendChild(li);
  }

  // 友達一覧
  const { data: friends } = await supabase
    .from("friends")
    .select("*")
    .or(`user1.eq.${me.id},user2.eq.${me.id}`)
    .eq("status","approved");

  friendsList.innerHTML="";
  for (let f of friends) {
    const fid = f.user1 === me.id ? f.user2 : f.user1;
    const { data:user } = await supabase.from("users").select("*").eq("id", fid).single();

    const li = document.createElement("li");
    li.innerText = user.username;
    li.onclick = ()=> openChat(user);
    friendsList.appendChild(li);
  }
}

// 承認
async function approve(id) {
  await supabase.from("friends").update({status:"approved"}).eq("id", id);
  loadFriends();
}

// 拒否
async function reject(id) {
  await supabase.from("friends").update({status:"rejected"}).eq("id", id);
  loadFriends();
}

// チャット開始
function openChat(user) {
  partner = user;
  chat.style.display="block";
  chatWith.innerText = "チャット相手：" + user.username;
  loadMessages();
}

// メッセージ取得
async function loadMessages() {
  const { data } = await supabase
    .from("messages")
    .select("*")
    .order("created_at");

  chatBox.innerHTML="";

  for (let m of data) {
    if (
      (m.from_user===me.id && m.to_user===partner.id) ||
      (m.from_user===partner.id && m.to_user===me.id)
    ) {
      const div = document.createElement("div");
      div.className = "message " + (m.from_user===me.id?"me":"other");
      div.innerHTML = `
        ${m.text}
        <div style="font-size:10px;color:gray;">
          ${new Date(m.created_at).toLocaleTimeString()} ${m.is_read?"既読":""}
        </div>`;
      chatBox.appendChild(div);
    }
  }

  await supabase.from("messages")
    .update({is_read:true})
    .eq("to_user", me.id)
    .eq("from_user", partner.id);
}

// Enter送信
msgInput.addEventListener("keydown", async e=>{
  if (e.key==="Enter" && !e.shiftKey) {
    e.preventDefault();
    await supabase.from("messages").insert({
      from_user: me.id,
      to_user: partner.id,
      text: msgInput.value
    });
    msgInput.value="";
    loadMessages();
  }
});
