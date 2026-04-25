let balances = [];
let history = [];
let colors = [];
let namesData = [];

const chipOptions = ["red","blue","green","black","white"];

// ADD PLAYER
function addPlayer(name="", color="red") {
    namesData.push(name);
    colors.push(color);
    balances.push(0);
    rebuildUI();
}

// DELETE
function deletePlayer(i) {
    namesData.splice(i,1);
    colors.splice(i,1);
    balances.splice(i,1);
    rebuildUI();
}

// UPDATE NAME
function updateName(i,val){
    namesData[i]=val;
    updateWinnerDropdown();
}

// UPDATE COLOR
function updateColor(i,val){
    colors[i]=val;
    rebuildUI();
}

// UI BUILD
function rebuildUI(){
    const container=document.getElementById("players");
    container.innerHTML="";

    namesData.forEach((name,i)=>{
        const avatar=`https://api.dicebear.com/7.x/adventurer/svg?seed=${i}`;

        const row=document.createElement("div");

        row.innerHTML=`
            <img src="${avatar}" class="avatar">
            <input value="${name}" onchange="updateName(${i},this.value)" placeholder="Name">
            <input type="number" class="bet" placeholder="Bet">
            <select onchange="updateColor(${i},this.value)">
                ${chipOptions.map(c=>`<option ${colors[i]==c?"selected":""}>${c}</option>`).join("")}
            </select>
            <div class="chip" style="background:${colors[i]}"></div>
            <div class="delete-btn" onclick="deletePlayer(${i})">✕</div>
        `;

        container.appendChild(row);
    });

    updateWinnerDropdown();
}

// DROPDOWN
function updateWinnerDropdown(){
    const dropdown=document.getElementById("winner");
    dropdown.innerHTML="";

    namesData.forEach((name,i)=>{
        const opt=document.createElement("option");
        opt.value=i;
        opt.text=name||`Player ${i+1}`;
        dropdown.appendChild(opt);
    });
}

// VALIDATION
function isValid(){
    if(namesData.length===0) return false;

    const bets=document.querySelectorAll(".bet");

    for(let b of bets){
        if(b.value==="" || parseFloat(b.value)<0){
            return false;
        }
    }
    return true;
}

// SAFE CALCULATE
function safeCalculate(){
    if(!isValid()){
        alert("Enter valid bets for all players");
        return;
    }
    calculate();
}

// CALCULATE
function calculate(){
    const bets=document.querySelectorAll(".bet");

    let total=0;
    let round=[];

    bets.forEach((b,i)=>{
        let bet=parseFloat(b.value)||0;
        total+=bet;
        round.push({name:namesData[i],bet});
    });

    document.getElementById("pot").innerText="Total Pot: "+total;

    const winnerIndex=document.getElementById("winner").value;

    let result=[];

    round.forEach((p,i)=>{
        let change=(i==winnerIndex)? total-p.bet : -p.bet;
        balances[i]+=change;

        result.push({
            name:p.name,
            change,
            color:colors[i],
            isWinner:i==winnerIndex
        });
    });

    history.push(result);

    // LAST RESULT
    document.getElementById("lastResult").innerText =
        `🏆 ${namesData[winnerIndex]} won +${total - round[winnerIndex].bet}`;

    // CLEAR BETS
    document.querySelectorAll(".bet").forEach(b=>b.value="");

    displayAll();
}

// DISPLAY
function displayAll(){
    const results=document.getElementById("results");
    results.innerHTML="<h2>Game History</h2>";

    history.forEach((round,i)=>{
        const div=document.createElement("div");
        div.className="round";

        div.innerHTML=`<div class="round-title">Round ${i+1}</div>`;

        round.forEach(p=>{
            const row=document.createElement("div");
            row.className="player-row";
            if(p.isWinner) row.classList.add("winner");

            row.innerHTML=`
                <span>
                    <span class="chip" style="background:${p.color}"></span>
                    ${p.isWinner?"🏆":""} ${p.name}
                </span>
                <span class="${p.change>=0?"profit":"loss"}">
                    ${p.change>0?"+":""}${p.change}
                </span>
            `;

            div.appendChild(row);
        });

        results.appendChild(div);
    });

    const totalDiv=document.createElement("div");
    totalDiv.className="round";
    totalDiv.innerHTML=`<div class="round-title">Total</div>`;

    namesData.forEach((name,i)=>{
        const row=document.createElement("div");
        row.className="player-row";

        row.innerHTML=`
            <span>
                <span class="chip" style="background:${colors[i]}"></span>
                ${name}
            </span>
            <span class="${balances[i]>=0?"profit":"loss"}">
                ${balances[i]>0?"+":""}${balances[i]}
            </span>
        `;

        totalDiv.appendChild(row);
    });

    results.appendChild(totalDiv);
}

// RESET
function resetGame(){
    balances=[];history=[];colors=[];namesData=[];
    rebuildUI();
    document.getElementById("results").innerHTML="";
    document.getElementById("pot").innerText="Total Pot: 0";
    document.getElementById("lastResult").innerText="";
}

// LOAD
window.onload=()=>{
    rebuildUI();
};