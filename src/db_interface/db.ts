import { promises as fs } from "fs";
import path from "path";



class JsonDB {
  defaultFolderPath = "../../database";
  print:any;
  constructor() {
    this.print = new Print();
    this.print.log('JSON Database Instance Created...');
  }

  async initialize(FileName:string) {
    return this.createFolder(FileName);
  }

  private async createFolder(fileName:string):Promise<string | undefined> {
    this.print.log('Creating a new File...');
    try {
      const folderPath = path.join(__dirname, this.defaultFolderPath, fileName);
      await fs.mkdir(folderPath, {recursive: true})
      this.print.log('Folder Created...');
      this.print.log('Path for the folder')
      return folderPath;
    } 
    catch (error) {
      this.print.error("Error creating folder:", error);
      return undefined
    }

  }
}


class Print {
  isConsole:boolean = true;

  log(...args:any) {
    this.isConsole && console.log(args)
  }

  error(...args:any) {
    this.isConsole && console.error(args)
  }
}


export default JsonDB