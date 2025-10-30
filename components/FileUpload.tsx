
import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { FileIcon } from './icons/FileIcon';
import { TrashIcon } from './icons/TrashIcon';

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
  disabled: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesChange, disabled }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = event.target.files ? Array.from(event.target.files) : [];
    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };
  
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;
    const newFiles = event.dataTransfer.files ? Array.from(event.dataTransfer.files) : [];
    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  }, [files, onFilesChange, disabled]);
  
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };
  
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };
  
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative block w-full rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 p-8 text-center hover:border-slate-400 dark:hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 transition-colors duration-300 ${isDragOver ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-400' : 'bg-slate-50 dark:bg-slate-800/50'} ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      >
        <input
          type="file"
          id="file-upload"
          multiple
          onChange={handleFileChange}
          accept="image/*,application/pdf"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={disabled}
        />
        <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
        <span className="mt-2 block text-sm font-semibold text-slate-900 dark:text-white">
          Drag and drop files here
        </span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">
          or click to select files
        </span>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">PDF, PNG, JPG supported</p>
      </div>

      {files.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Uploaded Files:</h3>
          <ul className="mt-2 divide-y divide-slate-200 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-md">
            {files.map((file, index) => (
              <li key={index} className="flex items-center justify-between py-2 pl-3 pr-4 text-sm">
                <div className="flex w-0 flex-1 items-center">
                  <FileIcon className="h-5 w-5 flex-shrink-0 text-slate-400" />
                  <span className="ml-2 w-0 flex-1 truncate font-medium">{file.name}</span>
                </div>
                <div className="ml-4 flex flex-shrink-0 items-center space-x-4">
                   <span className="text-slate-500 dark:text-slate-400">{formatBytes(file.size)}</span>
                   <button
                     onClick={() => removeFile(index)}
                     disabled={disabled}
                     className="text-slate-500 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                   >
                     <TrashIcon className="h-5 w-5" />
                   </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
