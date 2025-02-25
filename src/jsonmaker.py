#!/usr/bin/env python3
import os
import json

def get_creation_time(path):
    """Return the creation time of the file or folder."""
    return os.path.getctime(path)

def list_nabre_books(directory):
    """
    List folders in the given directory and the files within each folder,
    both sorted by creation time. The returned dictionary maps folder names
    to lists of file names.
    """
    output = {}

    # Get a list of folder names in the directory
    folders = [d for d in os.listdir(directory) if os.path.isdir(os.path.join(directory, d))]
    # Sort folders by creation time
    folders.sort(key=lambda d: get_creation_time(os.path.join(directory, d)))

    for folder in folders:
        folder_path = os.path.join(directory, folder)
        # List only files in this folder (ignoring any subdirectories)
        files = [f for f in os.listdir(folder_path) if os.path.isfile(os.path.join(folder_path, f))]
        # Sort files by creation time
        files.sort(key=lambda f: get_creation_time(os.path.join(folder_path, f)))
        output[folder] = files

    return output

if __name__ == '__main__':
    directory = 'nabre_books'  # Path to your nabre_books directory
    result = list_nabre_books(directory)
    print(json.dumps(result, indent=4))
