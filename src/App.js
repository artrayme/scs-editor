import React from 'react';
import {Treebeard, decorators} from 'react-treebeard';
import _, {includes} from 'lodash';
import MonacoEditor from 'react-monaco-editor';
import {Header, Div} from './Header';
import FileTree from './Utilities/FileTree';
import {Folder, Menu, Save, X, Plus, FileText} from 'react-feather';
import {config, language, scsTheme, getCompletionProvider} from './Utilities/scs-support';
import hotkeys from 'hotkeys-js';
import {convertGwfToScs} from './Utilities/converter'

const remote = window.require('electron').remote;
const fs = remote.require('fs');
const {dialog} = remote;

const isScsFile = (file) => (/\.scs$/ig.test(file));
const isGwfFile = (file) => (/\.gwf$/ig.test(file));
const isOpenableFile = (file) => isScsFile(file) || isGwfFile(file)


const editorWillMount = monaco => {
    monaco.languages.register({id: 'scs'});
    monaco.languages.registerCompletionItemProvider('scs', getCompletionProvider(monaco));
    monaco.languages.setMonarchTokensProvider('scs', language);
    monaco.languages.setLanguageConfiguration('scs', config);
    monaco.editor.defineTheme('scs', scsTheme);
}

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isOpenTreeView: true,
            file: '',
            content: '',
            window: {
                h: window.innerHeight,
                w: window.innerWidth
            },
            size: 200,
            data: {
                name: 'empty',
                toggled: false,
                children: [],
            },
            tabs: [],
            currentTab: 0
        };

        this.onToggle = this.onToggle.bind(this);
        this.handleOpenFolder = this.handleOpenFolder.bind(this);
    }

    getFileContent = (filepath, cb) => {
        let data = fs.readFileSync(filepath, {encoding: 'utf8'});
        // ToDo make check more reliable
        if (filepath.endsWith('.gwf')) {
            //  ToDo converter
             data = convertGwfToScs(data)
            // filepath.re
               // change filepath
        }
        cb(data);
    };

    componentDidMount() {
        hotkeys('ctrl+s', (function () {
            console.log(this.state.filepath, this.state.content)
            this.writeFile(this.state.filepath, this.state.content);
        }).bind(this));
    }

    saveFile = () => {
        dialog.showSaveDialog((fileName) => {
            if (fileName === undefined) {
                console.log("You didn't save the file");
                return;
            }

            fs.writeFile(fileName, this.state.content, (err) => {
                if (err) {
                    alert("An error ocurred creating the file " + err.message)
                }

                alert("The file has been succesfully saved");
            });
        });
    }

    writeFile(path, content) {
        console.log(path, content);
        fs.writeFile(path, content, (err) => {
            if (err) {
                alert("An error ocurred creating the file " + err.message)
            }

            alert("The file has been succesfully saved");
        });
    }

    onToggle(node, toggled) {
        const {data, cursor, currentTab} = this.state;

        if (isOpenableFile(node.name)) {
            const filepath = node.path + '/' + node.name;
            this.getFileContent(filepath, (data) => {
                this.setState({
                    filepath,
                    content: data
                });
            });
        }

        if (cursor) {
            if (!includes(cursor.children, node)) cursor.active = false
        }
        node.active = true;

        if (node.children) {
            node.toggled = toggled;
            node.active = false;
        }
        this.setState(() => ({cursor: node, data: Object.assign({}, data)}));

    }

    openFile = () => {
        const files = dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{name: 'All Files', extensions: ['scs', 'scsi', 'gwf']}]
        })
        let file = files[0]
        this.getFileContent(file, (content) => this.setState({content, filepath: files[0]}))
    }

    handleOpenFolder = () => {
        const directory = dialog.showOpenDialog({properties: ['openDirectory']});
        console.log(directory);
        if (directory && directory[0]) {
            const fileTree = new FileTree(directory[0]);
            fileTree.readDir(directory[0]);
            this.setState(() => ({data: {children: fileTree.children, name: fileTree.path}}));
        }
    };

    handleTreeView = () => {
        console.log(!!this.state.isOpenTreeView);
        this.setState((preState) => {
            return {
                isOpenTreeView: !preState.isOpenTreeView
            }
        })
    }

    editorDidMount(editor, monaco) {
        console.log('editorDidMount', editor);
        monaco.languages.register({id: 'scs'});
        monaco.languages.registerCompletionItemProvider('scs', getCompletionProvider(monaco));
        monaco.languages.setMonarchTokensProvider('scs', language);
        monaco.languages.setLanguageConfiguration('scs', config);
        monaco.editor.defineTheme('scs', scsTheme);
        console.log('monaco', monaco.languages.getLanguages());
        editor.focus();
    }

    onChange(content, e) {
        this.setState({
            content
        })
    }

    onTabClick = (tabIndex) => {
        const {currentTab, tabs} = this.state;

        console.log(tabIndex);
    }

    render() {
        const {data, isOpenTreeView, content, filepath} = this.state;

        const treeSize = isOpenTreeView ? 200 : 0;

        window.onresize = () => {
            this.setState({
                window: {
                    h: window.innerHeight,
                    w: window.innerWidth
                }
            })
        }

        return (
            <div className="container">
                <div className="tools-panel">
                    <button className="toolItem"
                            onClick={this.handleTreeView}>
                        <Menu
                            color="#9da5ab"
                            size={32}
                            alt="Close/Open the Tree"
                        />
                    </button>
                    <button className="toolItem"
                            onClick={this.openFile}>
                        <FileText
                            color="#9da5ab"
                            size={32}
                        />
                    </button>
                    <button className="toolItem"
                            onClick={this.handleOpenFolder}>
                        <Folder
                            color="#9da5ab"
                            size={32}
                        />
                    </button>
                    <button className="toolItem"
                            onClick={this.saveFile}>
                        <Save
                            color="#9da5ab"
                            size={32}
                        />
                    </button>
                </div>
                <Div id="element" className='file-tree' style={{
                    display: isOpenTreeView ? "block" : "none",
                    width: 300
                }}>
                    <Treebeard
                        className='treeview'
                        data={data}
                        onToggle={this.onToggle}
                        decorators={{...decorators, Header}}
                    />
                </Div>
                <div>
                    <MonacoEditor
                        width={this.state.window.w - 47 - treeSize}
                        height={this.state.window.h}
                        language="scs"
                        theme={"scs"}
                        value={content || "/"}
                        onChange={this.onChange.bind(this)}
                        editorWillMount={editorWillMount}
                        editorDidMount={this.editorDidMount}
                    />
                </div>
            </div>
        );
    }
}

export default App;
