import { screen } from '@testing-library/react';
import { renderRoute } from './renderApp';

describe('CoursePage', () => {
  it('renders the enrolled botanical course detail and lesson actions', async () => {
    renderRoute('/course/course-demo-react-viewer', 'user');

    expect(await screen.findByRole('heading', { name: /React Viewer Foundations/i }, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /课时列表|Lesson list/i })).toBeInTheDocument();
    expect(screen.getByText(/课程提示|Course note/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /开始本课|Start lesson/i })).toHaveLength(2);
    expect(screen.getAllByText(/已报名|Enrolled/i).length).toBeGreaterThanOrEqual(2);
  });
});
