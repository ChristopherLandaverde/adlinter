import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileDropZone from '@/components/FileDropZone';

function renderDropZone(props: Partial<React.ComponentProps<typeof FileDropZone>> = {}) {
  return render(
    <FileDropZone
      accept=".csv"
      label="CSV"
      onFile={jest.fn()}
      {...props}
    />,
  );
}

describe('FileDropZone', () => {
  it('should include a file input that accepts the configured file types', () => {
    const { container } = renderDropZone();

    const input = container.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('accept', '.csv');
  });

  it('should call onFile when selecting a file via input change', async () => {
    const user = userEvent.setup();
    const onFile = jest.fn();
    const file = new File(['name,campaign'], 'ads.csv', { type: 'text/csv' });
    const { container } = renderDropZone({ onFile });

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    expect(onFile).toHaveBeenCalledWith(file);
  });

  it('should apply and remove drag-over visual state', () => {
    const { container } = renderDropZone();
    const dropZone = container.firstElementChild as HTMLElement;

    fireEvent.dragOver(dropZone);
    expect(dropZone.className).toContain('bg-surface-2');
    expect(dropZone.className).toContain('ring-4');

    fireEvent.dragLeave(dropZone);
    expect(dropZone.className).not.toContain('ring-4');
  });

  it('should pass the dropped file to onFile', () => {
    const onFile = jest.fn();
    const file = new File(['{}'], 'container.json', { type: 'application/json' });
    const { container } = renderDropZone({ onFile, accept: '.json' });
    const dropZone = container.firstElementChild as HTMLElement;

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(onFile).toHaveBeenCalledWith(file);
  });

  it('should show the file name when uploaded', () => {
    renderDropZone({ uploaded: true, fileName: 'ads.csv' });

    expect(screen.getByText('ads.csv')).toBeInTheDocument();
  });

  it('should show a processing indicator when processing', () => {
    renderDropZone({ processing: true });

    expect(screen.getByText('Processing file...')).toBeInTheDocument();
  });

  it('should show an error message when error is set', () => {
    renderDropZone({ error: 'Could not parse this file.' });

    expect(screen.getByText('Could not parse this file.')).toBeInTheDocument();
  });
});
