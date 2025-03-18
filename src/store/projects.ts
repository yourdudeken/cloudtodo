import { create } from 'zustand';

export interface Project {
  id: string;
  name: string;
  color: string;
}

interface ProjectState {
  projects: Project[];
  addProject: (project: Omit<Project, 'id'>) => void;
  deleteProject: (id: string) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [
    { id: 'inbox', name: 'Inbox', color: '#246fe0' },
    { id: 'today', name: 'Today', color: '#058527' },
    { id: 'upcoming', name: 'Upcoming', color: '#692fc2' },
  ],
  addProject: (project) =>
    set((state) => ({
      projects: [...state.projects, { ...project, id: crypto.randomUUID() }],
    })),
  deleteProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== id),
    })),
  updateProject: (id, updatedProject) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === id ? { ...project, ...updatedProject } : project
      ),
    })),
}));