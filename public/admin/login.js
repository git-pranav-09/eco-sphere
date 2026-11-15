const params=new URLSearchParams(location.search);
const message=document.querySelector("#loginMessage");
if(params.get("error")==="not_admin") message.textContent="This Google account is not on the Echo Sphere administrator list.";
else if(params.get("error")==="google") message.textContent="Google sign-in could not be completed. Please try again.";
document.querySelector("#googleBtn").hidden=false;
document.querySelector("#googleBtn").addEventListener("click",()=>location.assign("/auth/google"));
document.querySelector("#loginForm").addEventListener("submit",e=>{e.preventDefault();message.textContent="Use the Google sign-in button. Access is limited to approved administrators.";});
