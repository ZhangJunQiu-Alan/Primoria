import { screen } from '@testing-library/react';
import { renderRoute } from './renderApp';

describe('CoursePage', () => {
  it('renders the enrolled botanical course detail and lesson actions', async () => {
    renderRoute('/course/course-demo-react-viewer', 'user');

    expect(await screen.findByRole('heading', { name: /React Viewer Foundations/i }, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Lesson list/i })).toBeInTheDocument();
    expect(screen.getByText(/Course note/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Start lesson/i })).toHaveLength(2);
    expect(screen.getAllByText(/Enrolled/i)).toHaveLength(2);
  });
});
