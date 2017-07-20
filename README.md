# VSC Projects+

<p align="center">
	<img src="https://raw.githubusercontent.com/fabiospampinato/vscode-projects-plus/master/resources/logo-128x128.png" alt="Logo">
</p>

An extension for managing projects. Feature rich, customizable, automatically finds your projects.

It comes packed with a lot of features:
- **Groups**: if you have many projects you'll find the ability to separate them into groups pretty valuable. Groups can be nested indefinitely.
- **Group switching**: if you have many groups, you can choose to view only projects belonging to a single one of them. Switching between groups is super easy.
- **GitTower integration** (macOS): if you are already using the awesome [GitTower](https://www.git-tower.com) for managing your repositories this extension can automatically import your repositories!
- **VSCode/Git/SVN integration**: it can find your VSCode/Git/SVN projects too.
- **Check path existence**: you can see at a glance which projects are currently usable. For instance if you have projects inside encrypted disk images this extension will basically tell you which are mounted and which are not.
- **Customizable**: add icons, sort groups/repositories manually or by name, custom indentation width, hide paths/descriptions, switch paths/descriptions position, customizable statusbar component.

## Install

Run the following in the command palette:

```shell
ext install vscode-projects-plus
```

## Usage

It adds 7 new commands to the command palette:

```js
'Project: Open' // Open a project in this window (cmd+alt+p on Mac, ctrl+alt+p Elsewhere)
'Project: Open in New Window' // Open a project in a new window (cmd+alt+shift+p on Mac, ctrl+alt+shift++p Elsewhere)
'Project: Save' // Save this project in the configuration file
'Project: Remove' // Remove this project from the configuration file
'Projects: Edit Configuration' // Open the configuration file
'Projects: Refresh' // Automatically find projects
'Projects: Switch Group' // Change context to another group (cmd+alt+x on Mac, ctrl+alt+x Elsewhere)
```

## Settings

```js
{
  "projects.activeIndicator": true, // Show an active indicator next to the name
  "projects.configPath": "/path/to/projects.json", // The location of the configuration file
  "projects.indentationSpaces": 4, // Number of spaces to use for indentation
  "projects.invertPathAndDescription": false, // Invert a project path and description
  "projects.showPaths": true, // Show projects' paths in the quickpick
  "projects.showDescriptions": true, // Show projects' descriptions in the quickpick
  "projects.checkPaths": false, // Check projects' paths existence
  "projects.group": "", // The active context group
  "projects.allGroupsName": "All Groups", // A setting for renaming the "All Groups" special group
  "projects.refreshDepth": 2, // Maximum depth to look at when refreshing
  "projects.refreshIgnoreFolders": ["node_modules",...], // Ignore these folders when refreshing
  "projects.refreshRoots": ['/path/to/projects',...], // Root paths from where to start searching for projects
  "projects.sortGroups": true, // Sort groups alphabetically
  "projects.sortProjects": true, // Sort projects alphabetically
  "projects.statusbarEnabled": true, // Enable the statusbar component
  "projects.statubarCommand": 'projects.open', // Command to execute on click
  "projects.statusbarTemplate": '$(file-directory) [group] $(chevron-right) [project]' // Template for rendering the statusbar content
}
```

## Configuration

Run the `Projects: Edit Configuration` command to create the configuration file. By default it uses a file named `vscode_projects.json` under your home directory, you can change this by supplying a custom path using the `projects.configPath` setting entry.

The configuration is an object that looks like this:

```js
{
  "groups": [{ // Array of groups
    "name": "Group", // Group's name
    "description": "Just a group", // Group's description
    "icon": "globe", // Group's icon
    "projects": [], // Array of projects
    "groups": [], // Groups can be nested indefinitely
  }],
  "projects": [{ // Array of projects
    "name": "Project", // Project's name
    "icon": "code", // Project's icon
    "description": "My awesome project", // Project's description
    "path": "/path/to/project" // Project's path
  }]
}
```

## Demo

#### Auto-import projects:

![Auto-import projects](resources/refresh.gif)

#### Save project:

![Auto-import projects](resources/save.gif)

#### Group switching:

![Auto-import projects](resources/switch.gif)

#### QuickPick customizations:

![Auto-import projects](resources/quickpick.gif)

#### Statusbar customizations:

![Auto-import projects](resources/statusbar.gif)

## Hits:

- **Sync projects**: make `projects.configPath` point to your Dropbox directory to have it synced between computers.
- **GitTower**: organize your repositories there and then run `Terminals: Refresh` to have this extension copy your configuration.
- **Icons**: [here](https://octicons.github.com/) you can browse a list of icons supported. If for instance you click the first icon, you'll get a page with `.octicon-alert` written in it, to get the string to use simply remove the `.octicon-` part, so in this case the icon name would be `alert`.

## License

MIT © Fabio Spampinato
