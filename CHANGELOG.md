### Version 1.21.1
- Avoiding using chokidar

### Version 1.21.0
- Added support for paths starting with `~/` to the `configPath`, `refreshIgnoreFolders` and `refreshRoots` settings

### Version 1.20.0
- Updated dirty-state icon
- Updated some git commands
- Added a `projects.showAheadBehind` setting

### Version 1.19.4
- Readme: using hi-res logo

### Version 1.19.3
- Outputting modern code (es2017, faster)
- Using "Debug Launcher" for debugging

### Version 1.19.2
- Fixed a regression

### Version 1.19.1
- Bundling with webpack

### Version 1.19.0
- Added `projects.viewOpenInNewWindow` setting

### Version 1.18.0
- Added GitTower v3 support

### Version 1.17.4
- Config: don’t override the path if the current one points to a `.code-workspace` file

### Version 1.17.3
- Ensuring the configuration will be opened as a non-preview editor

### Version 1.17.2
- Readme: added an hint about focusing to our activity bar view

### Version 1.17.1
- Updated readme
- Fixed actions on contributed views

### Version 1.17.0
- Added a view to the activity bar

### Version 1.16.2
- Explorer view: fixed left-click on projects to open them
- Refreshing contributed views only when necessary
- Avoiding using the terminal for adding a project to the workspace

### Version 1.16.1
- Replaced `logout` with `exit 0`

### Version 1.16.0
- Added a `projects.addToWorkspace` command

### Version 1.15.3
- Updated readme

### Version 1.15.2
- Explorer view: added tooltips

### Version 1.15.1
- Fixed `getProjectByPath` in Windows

### Version 1.15.0
- Added a `statusbarColor` option

### Version 1.14.1
- Fixed `groupsOnTop` logic

### Version 1.14.0
- Added support for paths starting with `~/`

### Version 1.13.2
- Readme: added info about `Projects: Open Group`

### Version 1.13.1
- Fixed left-click-to-open in explorer view

### Version 1.13.0
- Added a `Projects: Open Group` command

### Version 1.12.0
- Added multi-root support
- Statusbar: added support for custom alignment and priority

### Version 1.11.1
- Added an option for hiding the explorer view
- Ensuring `refresh` can’t be executed multiple times simultaneously
- Ensuring cache file deletion never throws an error

### Version 1.11.0
- Added basic Mercurial support

### Version 1.10.3
- Git: updated command for checking for dirtiness
- Ensuring local caches get cleared

### Version 1.10.2
- Executing shell commands in a more resilient manner
- `Projects: Refresh` now also clears up cache files

### Version 1.10.1
- Updated readme

### Version 1.10.0
- Added a `groupsOnTop` option

### Version 1.9.0
- Added right-click actions to the explorer view

### Version 1.8.2
- Fixed a minor bug

### Version 1.8.1
- Ensuring case different in projects’ paths doesn’t lead to projects duplication
- Using JSON5 in order to be more human-friendly
- Ensuring the configuration file won’t get overwritten by accident

### Version 1.8.0
- Added a `projects.openByName` command

### Version 1.7.2
- Fixed `projects.sortGroups` and `projects.sortProjects` options

### Version 1.7.1
- Documented `Projects` explorer

### Version 1.7.0
- Added a `Projects` view to the explorer
- Added a `projects.iconsASCII` setting
- Replaced Octicons with ASCII icons

### Version 1.6.1
- Updated readme

### Version 1.6.0
- Added a `projects.filterRegex` option

### Version 1.5.0
- Added a `projects.filterDirty` option

### Version 1.4.7
- Added support for detecting untracked files (Git)

### Version 1.3.7
- Ensuring a case-insensitive sort

### Version 1.3.5
- Warn when trying to open to the currently active project

### Version 1.2.5
- Improved Windows support

### Version 1.2.1
- Caching `dirty` and `branch` information

### Version 1.2.0
- Added ability to show a repository's branch next to its name

### Version 1.1.0
- Added ability to detect with projects are dirty

### Version 1.0.2
- Fixed an issue with subsequent refreshes when importing from GitTower

### Version 1.0.0
- Initial release
