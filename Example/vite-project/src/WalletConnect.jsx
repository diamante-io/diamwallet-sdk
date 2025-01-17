import React, { useState, useEffect } from "react";
import DIAMWalletConnectionSDK from "diamwallet-sdk-vite-mobile";
import "./WalletConnect.css";

const rnDiamWallet = new DIAMWalletConnectionSDK({
  platform: "web",
  appCallback: window.location.origin + "/callback",
  appName: "Demo App1",
  network: "testnet",
});

function WalletConnect() {
  const [connectionStatus, setConnectionStatus] = useState(false);
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState(null);
  const [sendView, setSendView] = useState(false);
  const [signView, setSignView] = useState(false);
  const [amount, setAmount] = useState("");
  const [publicAddress, setPublicAddress] = useState("");
  const [validPublicAddress, setValidPublicAddress] = useState(null);
  const [selectedXDR, setSelectedXdr] = useState("");

  const amountRejex = /^\d*\.?\d{0,6}$/;

  const getDIAMBalance = async () => {
    let balanceResponse = await rnDiamWallet.getBalance();
    setBalance(balanceResponse?.data?.balance || "0");
  };

  const connectWallet = async () => {
    try {
      console.log("Connecting wallet...");
      const result = await rnDiamWallet.connectWallet();
      console.log("Wallet connected!", result);
      if (result.status === true) {
        setAddress(result.address);
        setConnectionStatus(result.status);
      } else {
        alert(`Errors: ${result.data}`);
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      setConnectionStatus(false);
      alert(`Failed to connect: \n${error.message}`);
    } finally {
      let balanceResponse = await rnDiamWallet.getBalance();
      setBalance(balanceResponse?.data?.balance || "0");
    }
  };

  const sendTransaction = async () => {
    let transactionData = {
      amount,
      toAddress: publicAddress,
      signTransaction: false,
    };
    try {
      const result = await rnDiamWallet.sendTransaction(transactionData);
      if (result.success === true) {
        setAmount("");
        setPublicAddress("");
        setSendView(false);
        setValidPublicAddress(null);
        alert(`Transaction Success: \nHash: ${result.transactionDetails.hash}`);
      } else {
        alert(`Transaction Failed: ${result.transactionStatus}`);
      }
    } catch (error) {
      console.error("Failed to send transaction:", error);
      setAmount("");
      setPublicAddress("");
      setSendView(false);
      setValidPublicAddress(null);
    }
  };

  const handleDisconnect = () => {
    rnDiamWallet.disconnect();
    setAddress("");
    setConnectionStatus(false);
    setBalance(null);
    setSignView(false);
    setSendView(false);
    setAmount("");
    setPublicAddress("");
    setValidPublicAddress(null);
  };

  const initialzile = async () => {
    let data = await rnDiamWallet.initializeSdk();
    if (data) {
      setAddress(data.address);
      setConnectionStatus(data.status);
      let balanceResponse = await rnDiamWallet.getBalance();
      setBalance(balanceResponse.data.balance);
    }
  };
  useEffect(() => {
    initialzile();
  }, []);

  const addressValidation = async () => {
    let valid = await rnDiamWallet.validatePublicAddress(publicAddress);
    if (valid.valid === false) {
      alert(`${publicAddress} \nis not a valid address`);
      return;
    }
    setValidPublicAddress(valid.valid);
  };

  const signTransaction = async () => {
    let transactionData = {
      amount,
      toAddress: publicAddress,
      signTransaction: true,
    };
    try {
      const result = await rnDiamWallet.signTransaction(transactionData);
      if (result.success === true) {
        setSelectedXdr(result.signedXdr);
      } else {
        alert(`Transaction Failed: ${result.transactionStatus}`);
      }
    } catch (error) {
      console.error("Failed to sign transaction:", error);
    }
  };

  const sendSignedXDRTransaction = async () => {
    let transactionData = {
      signTransaction: false,
      xdr: selectedXDR,
    };
    try {
      const result = await rnDiamWallet.sendTransaction(transactionData);
      if (result.success === true) {
        setSelectedXdr("");
        alert(`Transaction Success: \nHash: ${result.transactionDetails.hash}`);
        setAmount("");
        setPublicAddress("");
        setSignView(false);
        setValidPublicAddress(null);
      } else {
        alert(`Transaction Failed: ${result.transactionStatus}`);
      }
    } catch (error) {
      console.error("Failed to send signed transaction:", error);
      setAmount("");
      setPublicAddress("");
      setSignView(false);
      setValidPublicAddress(null);
    }
  };

  return (
    <div className="container">
      <h2>Status: {connectionStatus ? "Connected" : "Disconnected"}</h2>
      {address && (
        <p>
          Wallet Address: {address.slice(0, 7)}...{address.slice(-7)}
        </p>
      )}
      {balance !== null && <p>Available Balance: {balance}</p>}

      {!connectionStatus ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <>
          <button onClick={getDIAMBalance}>Get Balance</button>

          {sendView && (
            <div className="send-view">
              <input
                type="text"
                placeholder="Enter Public Address"
                value={publicAddress}
                onChange={(e) => setPublicAddress(e.target.value)}
              />
              <input
                type="text"
                placeholder="Enter Amount"
                value={amount}
                onChange={(e) => {
                  if (
                    e.target.value === "" ||
                    amountRejex.test(e.target.value)
                  ) {
                    setAmount(e.target.value);
                  }
                }}
              />
              <button
                onClick={addressValidation}
                disabled={!publicAddress || publicAddress.length < 5}
              >
                Validate Address
              </button>
              <button
                onClick={sendTransaction}
                disabled={
                  !amount || validPublicAddress === null || !validPublicAddress
                }
              >
                Send
              </button>
              <button
                onClick={() => {
                  setAmount("");
                  setPublicAddress("");
                  setSendView(false);
                  setValidPublicAddress(null);
                }}
                className="cancel"
              >
                Cancel
              </button>
            </div>
          )}

          {signView && (
            <div className="sign-view">
              <input
                type="text"
                placeholder="Enter Public Address"
                value={publicAddress}
                onChange={(e) => setPublicAddress(e.target.value)}
              />
              <input
                type="text"
                placeholder="Enter Amount"
                value={amount}
                onChange={(e) => {
                  if (
                    e.target.value === "" ||
                    amountRejex.test(e.target.value)
                  ) {
                    setAmount(e.target.value);
                  }
                }}
              />
              <button
                onClick={addressValidation}
                disabled={!publicAddress || publicAddress.length < 5}
              >
                Validate Address
              </button>
              <button
                onClick={signTransaction}
                disabled={
                  !amount || validPublicAddress === null || !validPublicAddress
                }
              >
                Sign
              </button>
              <button
                onClick={() => {
                  setAmount("");
                  setPublicAddress("");
                  setSignView(false);
                  setValidPublicAddress(null);
                }}
                className="cancel"
              >
                Cancel
              </button>
            </div>
          )}

          {selectedXDR && (
            <button onClick={sendSignedXDRTransaction}>
              Send Signed Transaction
            </button>
          )}
          <button className="openView" onClick={() => setSendView(true)}>
            Open Send View
          </button>
          <button className="openView" onClick={() => setSignView(true)}>
            Open Sign View
          </button>

          <button onClick={handleDisconnect}>Disconnect Wallet</button>
        </>
      )}
    </div>
  );
}

export default WalletConnect;
