// DIAMWalletConnectionSDK.js
// import { Linking, AppState } from "react-native";

const isReactNative =
  typeof navigator !== "undefined" && navigator.product === "ReactNative";

let Linking, AppState;

if (isReactNative) {
  // React Native environment
  const ReactNative = require("react-native");
  Linking = ReactNative.Linking;
  AppState = ReactNative.AppState;
} else {
  // Web environment
  Linking = {
    openURL: (url) => window.open(url, "_blank"),
    getInitialURL: () => Promise.resolve(window.location.href),
  };
  AppState = {
    addEventListener: (event, handler) => {
      if (event === "change") {
        document.addEventListener("visibilitychange", () => {
          handler(
            document.visibilityState === "visible" ? "active" : "background"
          );
        });
      }
      return {
        remove: () => {
          document.removeEventListener("visibilitychange", handler);
        },
      };
    },
  };
}
class DIAMWalletConnectionSDK {
  constructor(options = {}) {
    this.deeplinkUrl = options.deeplinkUrl || "diamwallet://";
    this.callbackUrl = options.callbackUrl || "https://yourapp.com/callback";
    this.apiUrl = options.apiUrl || "https://api.diamwallet.com";
    this.connectedAccount = null;
    this.currentConnection = null;
    this.appStateSubscription = null;
    this.pollingInterval = null;
  }

  async connect() {
    if (this.currentConnection) {
      throw new Error("A connection attempt is already in progress");
    }

    return new Promise((resolve, reject) => {
      const sessionId = this.generateSessionId();
      const fullDeeplinkUrl = `${
        this.deeplinkUrl
      }connect?sessionId=${sessionId}&callback=${encodeURIComponent(
        this.callbackUrl
      )}`;

      this.currentConnection = { sessionId, resolve, reject };

      console.log("Opening URL:", fullDeeplinkUrl);

      this.setupAppStateListener();
      this.startPolling();

      Linking.openURL(fullDeeplinkUrl).catch((error) => {
        console.error("Failed to open DIAM wallet:", error);
        this.clearCurrentConnection();
        reject(new Error("Failed to open DIAM wallet"));
      });

      // Set a timeout for the connection attempt
      this.connectionTimeout = setTimeout(() => {
        console.log("Connection attempt timed out");
        this.clearCurrentConnection();
        reject(new Error("Connection timed out"));
      }, 300000); // 5 minutes timeout
    });
  }

  setupAppStateListener() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    this.appStateSubscription = AppState.addEventListener(
      "change",
      this.handleAppStateChange
    );
  }

  handleAppStateChange = (nextAppState) => {
    if (nextAppState === "active") {
      console.log("App has come to the foreground");
      this.checkIncomingUrl();
    }
  };

  startPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(() => {
      this.checkIncomingUrl();
    }, 1000); // Poll every second
  }

  async checkIncomingUrl() {
    try {
      const url = await Linking.getInitialURL();
      if (url) {
        console.log("Incoming URL detected:", url);
        this.handleIncomingUrl({ url });
      }
    } catch (error) {
      console.error("Error checking initial URL:", error);
    }
  }

  handleIncomingUrl = (event) => {
    console.log("Handling incoming URL:", event.url);
    if (event.url && event.url.startsWith(this.callbackUrl)) {
      this.handleCallbackUrl(event.url);
    }
  };

  handleCallbackUrl(url) {
    console.log("Processing callback URL:", url);
    const [, queryString] = url.split("?");
    const params = new URLSearchParams(queryString);
    const encodedData = params.get("data");

    if (this.currentConnection) {
      clearTimeout(this.connectionTimeout);

      if (encodedData) {
        try {
          const decodedData = JSON.parse(decodeURIComponent(encodedData));
          console.log("Decoded data:", decodedData);

          if (decodedData.sessionId === this.currentConnection.sessionId) {
            this.connectedAccount = decodedData.address;
            this.currentConnection.resolve(decodedData);
          } else {
            throw new Error("Session ID mismatch");
          }
        } catch (error) {
          console.error("Failed to parse response data:", error);
          this.currentConnection.reject(
            new Error("Failed to parse response data")
          );
        }
      } else {
        console.error("No data received in callback");
        this.currentConnection.reject(new Error("No data received"));
      }

      this.clearCurrentConnection();
    } else {
      console.warn(
        "Received callback, but no connection attempt was in progress"
      );
    }
  }

  clearCurrentConnection() {
    this.currentConnection = null;
    clearTimeout(this.connectionTimeout);
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  async disconnect() {
    if (!this.connectedAccount) {
      throw new Error("No account connected");
    }

    try {
      const response = await fetch(`${this.apiUrl}/disconnect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ account: this.connectedAccount }),
      });

      const data = await response.json();
      if (data.success) {
        this.connectedAccount = null;
        return true;
      } else {
        throw new Error("Failed to disconnect");
      }
    } catch (error) {
      throw new Error("Error during disconnection: " + error.message);
    }
  }

  async getBalance() {
    if (!this.connectedAccount) {
      throw new Error("No account connected");
    }

    try {
      const response = await fetch(
        `${this.apiUrl}/balance/${this.connectedAccount}`
      );
      const data = await response.json();
      return data.balance;
    } catch (error) {
      throw new Error("Failed to fetch balance: " + error.message);
    }
  }

  async sendTransaction(to, amount) {
    if (!this.connectedAccount) {
      throw new Error("No account connected");
    }

    try {
      const response = await fetch(`${this.apiUrl}/send-transaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.connectedAccount,
          to,
          amount,
        }),
      });

      const data = await response.json();
      return data.transactionHash;
    } catch (error) {
      throw new Error("Failed to send transaction: " + error.message);
    }
  }

  isConnected() {
    return !!this.connectedAccount;
  }

  getConnectedAccount() {
    return this.connectedAccount;
  }

  generateSessionId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        var r = (Math.random() * 16) | 0,
          v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  async checkIncomingUrl() {
    try {
      const url = isReactNative
        ? await Linking.getInitialURL()
        : window.location.href;
      if (url) {
        console.log("Incoming URL detected:", url);
        this.handleIncomingUrl({ url });
      }
    } catch (error) {
      console.error("Error checking initial URL:", error);
    }
  }
}

export default DIAMWalletConnectionSDK;
