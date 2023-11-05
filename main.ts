import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Plugin,
	PluginSettingTab,
	Setting,
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

		// This creates an icon in the left ribbon.
		// const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
		// 	// Called when the user clicks the icon.
		// 	new Notice('This is a notice!');
		// });

		// Perform additional things with the ribbon
		// ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
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

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText("Woah!");
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: TimestempPlugin;

	constructor(app: App, plugin: TimestempPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Settings for my awesome plugin." });

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						console.log("Secret: " + value);
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
