import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ImageUpload from '@/components/ImageUpload'
import { createMockFile } from '@/__tests__/utils/test-utils'

// Mock the dropzone hook
const mockUseDropzone = jest.fn()
jest.mock('react-dropzone', () => ({
  useDropzone: () => mockUseDropzone(),
}))

describe('ImageUpload', () => {
  const mockOnImagesSelected = jest.fn()
  const mockOnProcessingComplete = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseDropzone.mockReturnValue({
      getRootProps: jest.fn(() => ({})),
      getInputProps: jest.fn(() => ({})),
      isDragActive: false,
      acceptedFiles: [],
    })
  })

  it('renders upload area correctly', () => {
    render(
      <ImageUpload
        onImagesSelected={mockOnImagesSelected}
        onProcessingComplete={mockOnProcessingComplete}
      />
    )

    expect(screen.getByText(/drag & drop images here/i)).toBeInTheDocument()
    expect(screen.getByText(/or click to select files/i)).toBeInTheDocument()
    expect(screen.getByText(/supports jpg, png, webp/i)).toBeInTheDocument()
  })

  it('shows drag active state', () => {
    mockUseDropzone.mockReturnValue({
      getRootProps: jest.fn(() => ({})),
      getInputProps: jest.fn(() => ({})),
      isDragActive: true,
      acceptedFiles: [],
    })

    render(
      <ImageUpload
        onImagesSelected={mockOnImagesSelected}
        onProcessingComplete={mockOnProcessingComplete}
      />
    )

    expect(screen.getByText(/drop images here/i)).toBeInTheDocument()
  })

  it('displays accepted files', () => {
    const mockFiles = [
      createMockFile({ name: 'test1.jpg', size: 1024 * 1024 }),
      createMockFile({ name: 'test2.png', size: 2048 * 1024 }),
    ]

    mockUseDropzone.mockReturnValue({
      getRootProps: jest.fn(() => ({})),
      getInputProps: jest.fn(() => ({})),
      isDragActive: false,
      acceptedFiles: mockFiles,
    })

    render(
      <ImageUpload
        onImagesSelected={mockOnImagesSelected}
        onProcessingComplete={mockOnProcessingComplete}
      />
    )

    expect(screen.getByText('test1.jpg')).toBeInTheDocument()
    expect(screen.getByText('test2.png')).toBeInTheDocument()
    expect(screen.getByText('1.0 MB')).toBeInTheDocument()
    expect(screen.getByText('2.0 MB')).toBeInTheDocument()
  })

  it('shows processing state', () => {
    render(
      <ImageUpload
        onImagesSelected={mockOnImagesSelected}
        onProcessingComplete={mockOnProcessingComplete}
        isProcessing={true}
      />
    )

    expect(screen.getByText(/processing images/i)).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('shows progress bar with percentage', () => {
    render(
      <ImageUpload
        onImagesSelected={mockOnImagesSelected}
        onProcessingComplete={mockOnProcessingComplete}
        isProcessing={true}
        progress={75}
      />
    )

    expect(screen.getByText(/75%/i)).toBeInTheDocument()
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '75')
  })

  it('calls onImagesSelected when files are accepted', () => {
    const mockFiles = [createMockFile()]

    mockUseDropzone.mockReturnValue({
      getRootProps: jest.fn(() => ({})),
      getInputProps: jest.fn(() => ({})),
      isDragActive: false,
      acceptedFiles: mockFiles,
    })

    render(
      <ImageUpload
        onImagesSelected={mockOnImagesSelected}
        onProcessingComplete={mockOnProcessingComplete}
      />
    )

    expect(mockOnImagesSelected).toHaveBeenCalledWith(mockFiles)
  })

  it('displays file validation errors', () => {
    const mockFiles = [
      createMockFile({ name: 'test.txt', type: 'text/plain' }),
      createMockFile({ name: 'test.jpg', size: 20 * 1024 * 1024 }), // 20MB
    ]

    mockUseDropzone.mockReturnValue({
      getRootProps: jest.fn(() => ({})),
      getInputProps: jest.fn(() => ({})),
      isDragActive: false,
      acceptedFiles: mockFiles,
    })

    render(
      <ImageUpload
        onImagesSelected={mockOnImagesSelected}
        onProcessingComplete={mockOnProcessingComplete}
      />
    )

    expect(screen.getByText(/invalid file type/i)).toBeInTheDocument()
    expect(screen.getByText(/file too large/i)).toBeInTheDocument()
  })

  it('shows remove file button for each file', () => {
    const mockFiles = [
      createMockFile({ name: 'test1.jpg' }),
      createMockFile({ name: 'test2.png' }),
    ]

    mockUseDropzone.mockReturnValue({
      getRootProps: jest.fn(() => ({})),
      getInputProps: jest.fn(() => ({})),
      isDragActive: false,
      acceptedFiles: mockFiles,
    })

    render(
      <ImageUpload
        onImagesSelected={mockOnImagesSelected}
        onProcessingComplete={mockOnProcessingComplete}
      />
    )

    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    expect(removeButtons).toHaveLength(2)
  })

  it('handles file removal', () => {
    const mockFiles = [createMockFile({ name: 'test.jpg' })]
    const mockRemoveFile = jest.fn()

    mockUseDropzone.mockReturnValue({
      getRootProps: jest.fn(() => ({})),
      getInputProps: jest.fn(() => ({})),
      isDragActive: false,
      acceptedFiles: mockFiles,
    })

    render(
      <ImageUpload
        onImagesSelected={mockOnImagesSelected}
        onProcessingComplete={mockOnProcessingComplete}
        onRemoveFile={mockRemoveFile}
      />
    )

    const removeButton = screen.getByRole('button', { name: /remove/i })
    fireEvent.click(removeButton)

    expect(mockRemoveFile).toHaveBeenCalledWith(mockFiles[0])
  })

  it('shows processing completion message', () => {
    render(
      <ImageUpload
        onImagesSelected={mockOnImagesSelected}
        onProcessingComplete={mockOnProcessingComplete}
        isProcessing={false}
        hasProcessed={true}
      />
    )

    expect(screen.getByText(/processing complete/i)).toBeInTheDocument()
  })

  it('displays file count information', () => {
    const mockFiles = [
      createMockFile({ name: 'test1.jpg' }),
      createMockFile({ name: 'test2.png' }),
      createMockFile({ name: 'test3.webp' }),
    ]

    mockUseDropzone.mockReturnValue({
      getRootProps: jest.fn(() => ({})),
      getInputProps: jest.fn(() => ({})),
      isDragActive: false,
      acceptedFiles: mockFiles,
    })

    render(
      <ImageUpload
        onImagesSelected={mockOnImagesSelected}
        onProcessingComplete={mockOnProcessingComplete}
      />
    )

    expect(screen.getByText(/3 files selected/i)).toBeInTheDocument()
  })

  it('shows empty state when no files', () => {
    mockUseDropzone.mockReturnValue({
      getRootProps: jest.fn(() => ({})),
      getInputProps: jest.fn(() => ({})),
      isDragActive: false,
      acceptedFiles: [],
    })

    render(
      <ImageUpload
        onImagesSelected={mockOnImagesSelected}
        onProcessingComplete={mockOnProcessingComplete}
      />
    )

    expect(screen.getByText(/no files selected/i)).toBeInTheDocument()
  })

  it('handles processing errors', () => {
    render(
      <ImageUpload
        onImagesSelected={mockOnImagesSelected}
        onProcessingComplete={mockOnProcessingComplete}
        error="Failed to process images"
      />
    )

    expect(screen.getByText(/failed to process images/i)).toBeInTheDocument()
    expect(screen.getByText(/failed to process images/i)).toHaveClass('text-red-600')
  })
})
