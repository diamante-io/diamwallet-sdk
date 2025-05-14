import React, { useState, useEffect } from "react";
import DIAMWalletConnectionSDK from "diamwallet-sdk-vite-mobile";
import "./WalletConnect.css";
import axios from "axios";
import {
  Asset,
  Aurora,
  BASE_FEE,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
} from "diamnet-sdk";

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
  const [bep20SendView, setBep20SendView] = useState(false);

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
        const server = new Aurora.Server("https://diamtestnet.diamcircle.io/");

        const _account = await server.loadAccount(result.address);

        const authToken = new TransactionBuilder(_account, {
          fee: BASE_FEE,
          networkPassphrase: "Diamante Testnet 2024",
        })
          .addOperation(
            Operation.manageData({
              name: "Diam Stake",
              value: "1",
            })
          )
          .setTimeout(0)
          .build();

        const deductionXdr = authToken.toXDR("base64");
        console.log(deductionXdr);

        let xdr = await rnDiamWallet.sign({
          address: result.address,
          xdr: deductionXdr,
        });

        console.log(xdr);
        // let balanceResponse = await rnDiamWallet.getBalance();
        // setBalance(balanceResponse?.data?.balance || "0");
        if (xdr.status == true) {
          setAddress(result.address);
          setConnectionStatus(result.status);
        }
      } else {
        alert(`Errors: ${result.data}`);
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      setConnectionStatus(false);
      alert(`Failed to connect: \n${error.message}`);
    } finally {
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
        alert(`Transaction Failed: ${result.data.message}`);
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
    // handlegenerateCdr();
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

  const bep20AddressValidation = async () => {
    console.log("first", publicAddress);
    let valid = await rnDiamWallet.validateBep20PublicAddress(
      publicAddress,
      "DIAM (BEP20)" // Mandatory to send BEP20 DIAM
    );
    console.log(valid.valid, "===");
    if (valid.valid === false) {
      alert(`${publicAddress} \nis not a valid address`);
      return;
    }
    setValidPublicAddress(valid.valid);
  };

  const TransactionBep20 = async () => {
    let transactionData = {
      amount: amount,
      toAddress: publicAddress,
      signTransaction: false,
    };
    try {
      const result = await rnDiamWallet.sendBEP20Transaction(transactionData);
      console.log("Send Initiated!---", result.success);
      if (result.success === true) {
        setAmount("");
        setPublicAddress("");
        setBep20SendView(false);
        setValidPublicAddress(null);
        alert(`Transaction Success\n Hash: ${result.transactionDetails.hash}`);
      } else {
        alert(`Transaction Failed ${result.transactionStatus}`);
      }
      // setAddress(result.address);
      // setConnectionStatus(result.status);
      // getDIAMBalance();
    } catch (error) {
      console.error("Failed to send transaction:", error);
      setAmount("");
      setPublicAddress("");
      setBep20SendView(false);
      setValidPublicAddress(null);
    } finally {
    }
  };

  const handlegenerateCdr = async () => {
    console.log({ destination: address, asset: Asset.native(), amount: "2.0" });
    const server = new Aurora.Server("https://diamtestnet.diamcircle.io/");
    const sourceAccount = await server.loadAccount(address);

    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: "Diamante Testnet 2024",
    })
      .addOperation(
        Operation.payment({
          destination: address,
          asset: Asset.native(),
          amount: "2.0",
        })
      )
      .setTimeout(0)
      .build();
    const convertedXdr = transaction.toXDR("base64");
    console.log(convertedXdr);
    let transactionData = {
      signTransaction: false,
      xdr: convertedXdr,
    };
    const result = await rnDiamWallet.sendTransaction(transactionData);

    console.log(result);

    // let transactionData = new Transaction(
    //   convertedXdr,
    //   "Diamante Testnet 2024"
    // );
    // console.log(
    //   transactionData._signatures.length === 0,
    //   !transaction._signatures[0]
    // );
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

          {/* {signView && (
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
          )} */}

          {bep20SendView && (
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
                onClick={bep20AddressValidation}
                disabled={!publicAddress || publicAddress.length < 5}
              >
                Validate Address
              </button>
              <button
                onClick={TransactionBep20}
                disabled={
                  !amount || validPublicAddress === null || !validPublicAddress
                }
              >
                Send Bep20
              </button>
              <button
                onClick={() => {
                  setAmount("");
                  setPublicAddress("");
                  setBep20SendView(false);
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
          <button className="openView" onClick={() => setBep20SendView(true)}>
            Open Send BEP20 View
          </button>

          <button onClick={handleDisconnect}>Disconnect Wallet</button>
        </>
      )}
    </div>
  );
}

export default WalletConnect;
