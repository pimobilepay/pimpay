import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pimobipay.app",
  appName: "PiMobiPay",
  webDir: "out",
  server: {
    url: "https://pimpay.vercel.app",
    cleartext: false
  }
};

export default config;
