const ethers = require('ethers');

async function check() {
    const rpcUrl = 'https://rpc.sidrachain.com';
    const address = '0x158cF15ddB0aA3cD6e8E116e750fFb08A8F8520e'; 

    try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const balance = await provider.getBalance(address);
        
        console.log(`✅ Adresse valide détectée pour Pimpay`);
        console.log(`💰 Solde actuel : ${ethers.formatEther(balance)} SDA`);
        
        const txCount = await provider.getTransactionCount(address);
        console.log(`🔢 Nombre de transactions : ${txCount}`);
    } catch (e) {
        console.error("❌ Erreur de connexion :", e.message);
    }
}
check();
