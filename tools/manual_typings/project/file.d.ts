interface fileplugin {
  file: {
    /* Read-only directory where the application is installed. */
    applicationDirectory: string;
    /* Root of app's private writable storage */
    applicationStorageDirectory: string;
    /* Where to put app-specific data files. */
    dataDirectory: string;
    /* Cached files that should survive app restarts. Apps should not rely on the OS to delete files in here. */
    cacheDirectory: string;
    /* Android: the application space on external storage. */
    externalApplicationStorageDirectory: string;
    /* Android: Where to put app-specific data files on external storage. */
    externalDataDirectory: string;
    /* Android: the application cache on external storage. */
    externalCacheDirectory: string;
    /* Android: the external storage (SD card) root. */
    externalRootDirectory: string;
    /* iOS: Temp directory that the OS can clear at will. */
    tempDirectory: string;
    /* iOS: Holds app-specific files that should be synced (e.g. to iCloud). */
    syncedDataDirectory: string;
    /* iOS: Files private to the app, but that are meaningful to other applciations (e.g. Office files) */
    documentsDirectory: string;
    /* BlackBerry10: Files globally available to all apps */
    sharedDirectory: string
  }
}

declare var fileplugin: fileplugin;
