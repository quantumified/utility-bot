require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages]
});

// Check env variables
if (!process.env.CLIENT_ID) {
    console.error('Error: CLIENT_ID is missing in .env');
    process.exit(1);
}
if (!process.env.DISCORD_TOKEN) {
    console.error('Error: DISCORD_TOKEN is missing in .env');
    process.exit(1);
}

client.commands = new Collection();

// Load commands from commands folder
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const commandsArray = [];

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if ('name' in command && 'execute' in command) {
        client.commands.set(command.name, command);
        commandsArray.push({
            name: command.name,
            description: command.description,
            options: command.options || [],
        });
    }
}

// Sync commands globally & per guild
async function syncCommands() {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('Started syncing commands globally...');
        // Global commands
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commandsArray });
        console.log('✅ Global commands synced.');

        // Per-guild commands
        for (const [guildId] of client.guilds.cache) {
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
                { body: commandsArray }
            );
            console.log(`✅ Synced commands for guild ${guildId}`);
        }

        console.log('All commands synced successfully.');
    } catch (error) {
        console.error('Error syncing commands:', error);
    }
}

// Handle slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({
            content: 'There was an error while executing this command!',
            ephemeral: true,
        });
    }
});

// Login
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    await syncCommands(); // Sync commands globally and per guild
});
client.login(process.env.DISCORD_TOKEN);
console.log("change this part")
