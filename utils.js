import "dotenv/config";
import { verifyKey } from "discord-interactions";

export function VerifyDiscordRequest(clientKey) {
  return function (req, res, buf) {
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];

    if (!signature || !timestamp) {
      console.error('Missing signature or timestamp');
      res.statusCode = 401;
      return res.end('Bad request signature');
    }

    const isValidRequest = verifyKey(buf, signature, timestamp, clientKey);
    if (!isValidRequest) {
      console.error('Request verification failed');
      res.statusCode = 401;
      return res.end('Bad request signature');
    }
  };
}


export async function DiscordRequest(endpoint, options) {
  const url = "https://discord.com/api/v10/" + endpoint;

  console.log(`Sending request to URL: ${url}`);
  console.log(`Request options: ${JSON.stringify(options)}`);

  if (options.body) options.body = JSON.stringify(options.body);

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
        "Content-Type": "application/json; charset=UTF-8",
        "User-Agent":
          "DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)",
      },
      ...options,
    });

    console.log(`Response status: ${res.status}`);

    if (!res.ok) {
      const data = await res.json();
      console.error(`API error: ${res.status} - ${JSON.stringify(data)}`);
      throw new Error(JSON.stringify(data));
    }

    return res;
  } catch (error) {
    console.error(`Error in DiscordRequest: ${error.message}`);
    throw error;
  }
}

export async function InstallGlobalCommands(appId, commands) {
  const endpoint = `applications/${appId}/commands`;

  console.log(`Installing global commands at endpoint: ${endpoint}`);
  console.log(`Commands: ${JSON.stringify(commands)}`);

  try {
    await DiscordRequest(endpoint, { method: "PUT", body: commands });
    console.log("Global commands installed successfully.");
  } catch (err) {
    console.error(`Error installing global commands: ${err.message}`);
  }
}

export function capitalize(str) {
  console.log(`Capitalizing string: ${str}`);
  return str.charAt(0).toUpperCase() + str.slice(1);
}
