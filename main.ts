import {
	MarkdownView,
	Plugin,
	TFile,
} from "obsidian";

// Remember to rename these classes and interfaces!

interface TimestempPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: TimestempPluginSettings = {
	mySetting: "default",
};

export default class TimestempPlugin extends Plugin {
	settings: TimestempPluginSettings;

	async onload() {
		await this.loadSettings();

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "insert-timestamp",
			name: "Insert Timestamp",
			callback: () => {
				this.insertTimestamp();
			},
		});

	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async insertTimestamp(): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) return; // No active file, do nothing

		const editor =
			this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
		if (!editor) return; // No active editor found, do nothing

		const now = new Date();
		const currentDate: string = now.toISOString().slice(0, 10);
		const currentTime: string = now.toISOString().slice(11, 19);
		const timestamp: number = now.getTime();

		if (activeFile.basename === currentDate) {
			editor.replaceSelection(`###### ⏲ *${currentDate} ${currentTime}*`);
		} else {
			const dailyNotePath = `Journal/Daily/${currentDate}`;
			const linkText = `[[${dailyNotePath}#^${timestamp}|${currentDate} ${currentTime}]]`;
			editor.replaceSelection(`###### ⏲ *${linkText}*`);
			await this.insertLineInDailyNote(
				currentDate,
				activeFile.basename,
				timestamp
			);
		}
	}

	async insertLineInDailyNote(
		currentDate: string,
		originatingFileName: string,
		timestamp: number
	): Promise<void> {
		const dailyNotePath = `Journal/Daily/${currentDate}.md`;
		const dailyNote = this.app.vault.getAbstractFileByPath(dailyNotePath);

		// Check if the abstract file is indeed a file, not a folder
		if (dailyNote instanceof TFile) {
			const fileContents: string = await this.app.vault.read(dailyNote);
			const headerReference = `${currentDate}${timestamp
				.toString()
				.slice(0, -3)}`;
			const lineToAdd = `![[${originatingFileName}#⏲ * Journal/Daily/${currentDate} ${headerReference} ${currentDate.replace(
				/-/g,
				" "
			)} *]]\n`;

			if (!fileContents.includes(lineToAdd)) {
				await this.app.vault.modify(
					dailyNote,
					fileContents + "\n" + lineToAdd
				);
			}
		} else {
			console.error("The daily note is not a file: ", dailyNotePath);
		}
	}
}
