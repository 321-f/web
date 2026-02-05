const supabaseUrl = "https://YOUR_PROJECT.supabase.co";
const supabaseKey = "YOUR_ANON_KEY";
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;
let chatPartner = null;

async function register(){
 const u=username.value,p=password.value,p2=password2.value;
 if(!u||!p||!p2) return alert("全部入力");
 if(p!==p2) return alert("一致しません");

 const {data,error}=await supabase.from("users").insert([{username:u,password:p}]);
 if(error) alert("登録失敗");
 else alert("登録完了");
}

async function login(){
 const u=username.value,p=password.value;
 const {data}=await supabase.from("users").select("*").eq("username",u).eq("password",p).single();
 if(!data) return alert("ログイン失敗");

 currentUser=u;
 showQR();
}

function showQR(){
 auth.classList.add("hidden");
 qrScreen.classList.remove("hidden");
 qr.innerHTML="";
 new QRCode(qr,currentUser);
 startQRScan();
}

function startQRScan(){
 const html5QrCode=new Html5Qrcode("reader");
 html5QrCode.start({facingMode:"environment"},{fps:10,qrbox:200},qrText=>{
   html5QrCode.stop();
   requestChat(qrText);
 });
}

async function requestChat(target){
 const {data}=await supabase.from("users").select("*").eq("username",target).single();
 if(!data) return alert("存在しません");

 requestBox.innerHTML=`${target}とチャットしますか？
 <button onclick="approve('${target}')">承認</button>`;
}

async function approve(target){
 await supabase.from("friends").insert([{user1:currentUser,user2:target,approved:true}]);
 openChat(target);
}

function openChat(target){
 chatPartner=target;
 qrScreen.classList.add("hidden");
 chatScreen.classList.remove("hidden");
 chatWith.textContent=target+" とチャット中";
 loadMessages();
 subscribeMessages();
}

function getTime(){
 const d=new Date();
 return d.getHours().toString().padStart(2,"0")+":"+d.getMinutes().toString().padStart(2,"0");
}

async function sendMessage(){
 const text=messageInput.value.trim();
 if(!text) return;

 await supabase.from("messages").insert([{
   sender:currentUser,
   receiver:chatPartner,
   text:text,
   time:getTime(),
   read:true
 }]);

 messageInput.value="";
}

async function loadMessages(){
 const {data}=await supabase.from("messages")
 .select("*")
 .or(`and(sender.eq.${currentUser},receiver.eq.${chatPartner}),and(sender.eq.${chatPartner},receiver.eq.${currentUser})`)
 .order("id");

 chatBox.innerHTML="";
 data.forEach(m=>{
   const div=document.createElement("div");
   div.className="message "+(m.sender===currentUser?"mine":"other");
   div.innerHTML=`
     ${m.text}
     <div class="time">${m.time} ${m.sender===currentUser?"✓✓":""}</div>
   `;
   chatBox.appendChild(div);
 });
 chatBox.scrollTop=chatBox.scrollHeight;
}

function subscribeMessages(){
 supabase.channel("chat")
 .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},payload=>{
   loadMessages();
 }).subscribe();
}

messageInput.addEventListener("keydown",e=>{
 if(e.key==="Enter"&&!e.shiftKey){
   e.preventDefault();
   sendMessage();
 }
});

function logout(){ location.reload(); }
