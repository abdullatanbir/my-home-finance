import {
    ChangeEvent,
    useState
} from 'react';

import {
    restoreBackup
} from '../lib/backup';

import type {
    BackupData
} from '../lib/data';


export default function RestoreBackup({
                                          onDone
                                      }: {
    onDone: () => void;
}) {

    const [
        message,
        setMessage
    ] =
        useState('');

    const [
        restoring,
        setRestoring
    ] =
        useState(false);


    async function restoreFile(
        file?: File
    ) {
        if (!file) {
            return;
        }


        setMessage('');


        /*
         * My Home Finance restore currently supports
         * JSON backup files only.
         */
        if (
            !file.name
                .toLowerCase()
                .endsWith('.json')
        ) {
            setMessage(
                'Please select a My Home Finance JSON backup file.'
            );

            return;
        }


        try {

            const text =
                await file.text();


            const backup =
                JSON.parse(
                    text
                ) as BackupData;


            const approved =
                window.confirm(
                    'Restore this backup? Current financial records on this device will be replaced.'
                );


            if (!approved) {
                return;
            }


            setRestoring(
                true
            );


            await restoreBackup(
                backup
            );


            setMessage(
                'Backup restored successfully.'
            );


            onDone();

        } catch (error) {

            setMessage(
                error instanceof Error
                    ? error.message
                    : 'Restore failed.'
            );

        } finally {

            setRestoring(
                false
            );
        }
    }


    function handleFileChange(
        event:
        ChangeEvent<HTMLInputElement>
    ) {

        const file =
            event.target
                .files?.[0];


        void restoreFile(
            file
        );


        /*
         * Reset the file input so the same
         * backup can be selected again.
         */
        event.target.value =
            '';
    }


    return (
        <div className="restoreBackup">

            <label
                className={`restorePicker ${
                    restoring
                        ? 'restoring'
                        : ''
                }`}
            >

                <span
                    className="restorePickerIcon"
                    aria-hidden="true"
                >
                    {restoring
                        ? '◌'
                        : '↥'}
                </span>


                <span className="restorePickerText">

                    <strong>
                        {restoring
                            ? 'Restoring Backup...'
                            : 'Choose Backup File'}
                    </strong>

                    <small>
                        JSON backup file
                    </small>

                </span>


                <input
                    type="file"
                    accept="application/json,.json"
                    disabled={
                        restoring
                    }
                    onChange={
                        handleFileChange
                    }
                />

            </label>


            {message && (
                <div
                    className="restoreMessage"
                    role="status"
                >
                    <span
                        className="restoreMessageIcon"
                        aria-hidden="true"
                    >
                        {message ===
                        'Backup restored successfully.'
                            ? '✓'
                            : '!'}
                    </span>

                    <span>
                        {message}
                    </span>
                </div>
            )}

        </div>
    );
}