const remote = window.require('electron').remote;
const electronFs = remote.require('fs');

export default class FileTree {
    constructor(path, name = null) {
        this.path = path;
        this.name = name;
        this.children = [];
    }

    readDir = (path) => {
        const fileArray = [];
        electronFs.readdir(path, (err, items) => {
            console.log(path);
            try {
                items.forEach((file) => {
                    const stat = electronFs.statSync(`${path}/${file}`);
                    if (stat.isDirectory()) {
                        this.children = this.readDir(`${path}/${file}`);
                        fileArray.push({name: file, children: this.children, path});
                    } else if (stat.isFile() && (/\.scs$/ig.test(file) || /\.gwf$/ig.test(file))) {
                        fileArray.push({name: file, path});
                    }
                })
            } catch (err) {
                console.log(err)
            }
        });
        setTimeout(_ => fileArray.sort(a => a.children ? -1 : 1));
        return this.children = fileArray;
    }
}




