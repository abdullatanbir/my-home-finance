import {
 BackupData,
 replaceBackup
} from './data';


export async function restoreBackup(
    backup: BackupData
) {
 await replaceBackup(backup);

 return true;
}