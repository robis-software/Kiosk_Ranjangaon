import { promises as fs } from "fs";
import path from "path";


/**
 * Used to Create and Maintain data in JSON in the code
 * 
 * @Important
 * Always use initialize() Object, before using other objects
 */
class JsonDB {
  defaultFolderPath = "../../Databases";
  print:any;

  constructor() {
    this.print = new Print();
    this.print.log('JSON Database Instance Created...');
  }

  // ===================================================================================================
  // User Exposed Functions
  // ===================================================================================================

  /**
   * Used to initialize the operation by creating the respective folder to store data
   * @param folderName :string
   * @returns boolean
   */
  async initialize(folderName:string) {
    try {
      await this.createFolder(folderName);
      return true
    }
    catch(error:any) {
      this.print.error('Error in creating folder, ',error);
      return false
    }
  }

  /**
   * Used to insert data to the respective file in the respective folder
   * @param folderName :string
   * @param fileName :string => Send the filename with its extension
   * @param message :string => send the formatted message to insert in the file
   * @returns boolean
   */
  async insertDataToFile(folderName:string, fileName:string, message:string) {
    try {
      await this.createAndInsertFile(folderName, fileName, message);
      return true
    } 
    catch (error) {
      this.print.error('Error in inserting a data to the file', error);
      return false
    }
  }

  /**
   * Used to delete a file in respective folder
   * @param folderName :string
   * @param fileName :string => Send the filename with its extension
   * @returns boolean
   */
  async deleteFileInFolder(folderName:string, fileName:string) {
    try {
      await this.deleteFile(folderName, fileName);
      return true
    } 
    catch (error) {
      this.print.error('Error in inserting a data to the file', error);
      return false
    }
  }

  /**
   * Used to delete a folder in respective from DB
   * @param folderName :string
   * @returns boolean
   */
  async deleteFolderInDB(folderName:string) {
    try {
      await this.deleteFolder(folderName);
      return true
    } 
    catch (error) {
      this.print.error('Error in inserting a data to the file', error);
      return false
    }
  }

  /**
   * Used to read data inside the file in respective folder
   * @param folderName :string
   * @param fileName :string => Send the filename with its extension
   * @returns respective data in a array format
   */
  async readDataInFile(folderName:string, fileName:string) {
    try {
      const data:any = await this.readFile(folderName, fileName);
      return data;
    } 
    catch (error) {
      this.print.error('Error in inserting a data to the file', error);
      return []
    }
  }

  /**
   * Used to get list of files in folder
   * @param folderName :string
   * @returns List of the files that are present in the respectice folder
   */
  async getListOfFile(folderName:string) {
    try {
      const data:any = await this.readFolder(folderName);
      return data
    } 
    catch (error) {
      this.print.error('Error in inserting a data to the file', error);
      return []
    }
  }

  /**
   * Used to update the data by over-writing the existing data
   * @param folderName :string
   * @param fileName :string => Send the filename with its extension
   * @param message :string
   * @returns 
   */
  async updateFile(folderName:string, fileName:string, message:string) {
    try {
      await this.overWriteFile(folderName, fileName, message);
      return true
    } 
    catch (error) {
      this.print.error('Error in updating a data to the file', error);
      return false
    }
  }
  

  // ===================================================================================================
  // Actions that are done - Private function
  // ===================================================================================================

  /**
   * Used to create an file in the respective folder and insert the message in the respective folder;
   * @param folderName :string
   * @param fileName :string
   * @param message :string
   */
  private async createAndInsertFile(folderName:string, fileName:string, message:string) {
    console.log(folderName, fileName, message);
    try {
      const folderPath = this.createFolderPath(folderName);
      const filePath = this.createFilePath(folderPath, fileName);
      await fs.appendFile(filePath, `${message}\n`);
      this.print.log('Logged Message =>', message);
    }   
    catch (error:any) {
      this.print.error('Error in creating File',error);
      throw error;
    }
  }

  /**
   * Used to create a folder in the desired path
   * @param folderName :string
   */
  private async createFolder(folderName:string) {
    this.print.log('Creating a new File...');
    try {
      const folderPath = this.createFolderPath(folderName);
      await fs.mkdir(folderPath, {recursive: true})
      this.print.log('Folder Created...');
    } 
    catch (error) {
      this.print.error("Error creating folder:", error);
      throw error;
    }

  }

  /**
   * Used to update the file by overwriting the complete file with new message
   * @param folderName : string
   * @param fileName : string
   * @param message : string
   */
  private async overWriteFile(folderName:string, fileName:string, message:string) {
    const folderPath = this.createFolderPath(folderName);
    const filePath = this.createFilePath(folderPath, fileName);
    try {
      await fs.writeFile(filePath, message);
    }
    catch(error:any) {
      this.print.error('Error in reading the file', error);
    }
  }

  /**
   * Used to read a file in the respective folder
   * @param folderName :string
   * @param fileName :string
   * @returns Raw data in the respective file
   */
  private async readFile(folderName:string, fileName:string) {
    const folderPath = this.createFolderPath(folderName);
    const filePath = this.createFilePath(folderPath, fileName);

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return data;
    }
    catch(error:any) {
      this.print.error('Error in reading the file', error);
    }
  }

  /**
   * Used to get the file's name in a folder
   * @param folderName :string
   * @returns List of the file name in the respective folder
   */
  private async readFolder(folderName:string) {
    const folderPath = this.createFolderPath(folderName);
    try {
      const list_of_files = await fs.readdir(folderPath);
      return list_of_files;
    } 
    catch (error:any) {
      this.print.error('Error in reading the Folder', error);
      throw error;
    }
  }

  /**
   * Used to Delete an file in the respective folder
   * @param folderName :string
   * @param fileName :string
   */
  private async deleteFile(folderName:string, fileName:string) {
    const folderPath = this.createFolderPath(folderName);
    const filePath = this.createFilePath(folderPath, fileName);

    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
      this.print.log('File Deleted => ', filePath);
    }
    catch(error:any) {
      this.print.error('Error in deleting the file',error);
    }
  }

  /**
   * Used to delete the respective folder in DB
   * @param folderName :string
   */
  private async deleteFolder(folderName:string) {
    const folderPath = this.createFolderPath(folderName);
    try {
      await fs.rm(folderPath, {recursive: true, force: true});
      this.print.log('Folder Deleted in the path', folderPath);
    }
    catch(error:any) {
      this.print.error('Error in deleting the folder', error)
    }
  }

  // ===================================================================================================
  // Helper Functions
  // ===================================================================================================

  /**
   * Used to create an path string of the folder where it is to be created
   * @param folderName :string
   * @returns path of the folder
   */
  private createFolderPath(folderName:string) {
    return path.join(__dirname, this.defaultFolderPath, folderName);
  }

  /**
   * Used to create Path for the file that is to be created in a folder
   * @param folderPath :string
   * @param fileName :string
   * @returns path of the created file in the folder
   */
  private createFilePath(...args:any) {
    return path.join(...args)
  }
}

/**
 * Internal Class used to handle the console.log in this function
 */
class Print {
  isConsole:boolean = true;

  log(...args:any) {
    this.isConsole && console.log(...args)
  }

  error(...args:any) {
    this.isConsole && console.error(...args)
  }
}


export default JsonDB