'use server'

import { supabaseAdmin } from '@/lib/supabase'

interface CreateFolderInput {
  faculty_id: string
  folder_name: string
  parent_folder_id?: string
  standard: string
  subject: string
}

interface FolderWithChildren {
  id: string
  folder_name: string
  parent_folder_id?: string
  faculty_id: string
  standard: string
  subject: string
  created_at: string
  children?: FolderWithChildren[]
  materials?: any[]
}

export async function createFolder(input: CreateFolderInput) {
  try {
    const { data, error } = await supabaseAdmin
      .from('study_material_folders')
      .insert([
        {
          faculty_id: input.faculty_id,
          folder_name: input.folder_name,
          parent_folder_id: input.parent_folder_id || null,
          standard: input.standard,
          subject: input.subject,
        },
      ])
      .select()

    if (error) {
      console.error('[v0] Create folder error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('[v0] Create folder error:', error)
    return { success: false, error: String(error) }
  }
}

export async function getFoldersByFaculty(faculty_id: string, standard: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('study_material_folders')
      .select('*')
      .eq('faculty_id', faculty_id)
      .eq('standard', standard)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[v0] Get folders error:', error)
      return { success: false, error: error.message }
    }

    // Build hierarchical structure
    const buildHierarchy = (folders: any[], parentId: string | null = null): FolderWithChildren[] => {
      return folders
        .filter((f) => f.parent_folder_id === parentId)
        .map((folder) => ({
          ...folder,
          children: buildHierarchy(folders, folder.id),
        }))
    }

    const hierarchicalFolders = buildHierarchy(data || [])

    return { success: true, data: hierarchicalFolders }
  } catch (error) {
    console.error('[v0] Get folders error:', error)
    return { success: false, error: String(error) }
  }
}

export async function getFoldersAndMaterialsByStandard(standard: string) {
  try {
    const { data: folders, error: foldersError } = await supabaseAdmin
      .from('study_material_folders')
      .select('*')
      .eq('standard', standard)
      .order('created_at', { ascending: true })

    if (foldersError) {
      console.error('[v0] Get folders error:', foldersError)
      return { success: false, error: foldersError.message }
    }

    const { data: materials, error: materialsError } = await supabaseAdmin
      .from('study_materials')
      .select('*')
      .eq('standard', standard)
      .order('uploaded_date', { ascending: false })

    if (materialsError) {
      console.error('[v0] Get materials error:', materialsError)
      return { success: false, error: materialsError.message }
    }

    // Build hierarchical structure with materials
    const buildHierarchy = (folders: any[], materials: any[], parentId: string | null = null): FolderWithChildren[] => {
      return folders
        .filter((f) => f.parent_folder_id === parentId)
        .map((folder) => ({
          ...folder,
          children: buildHierarchy(folders, materials, folder.id),
          materials: materials.filter((m) => m.folder_id === folder.id),
        }))
    }

    const hierarchicalFolders = buildHierarchy(folders || [], materials || [])
    const rootMaterials = (materials || []).filter((m: any) => !m.folder_id)

    return { success: true, data: { folders: hierarchicalFolders, materials: rootMaterials } }
  } catch (error) {
    console.error('[v0] Get folders and materials error:', error)
    return { success: false, error: String(error) }
  }
}

export async function deleteFolder(id: string) {
  try {
    // Check if folder has children or materials
    const { data: children } = await supabaseAdmin
      .from('study_material_folders')
      .select('id')
      .eq('parent_folder_id', id)

    const { data: materials } = await supabaseAdmin
      .from('study_materials')
      .select('id')
      .eq('folder_id', id)

    if ((children && children.length > 0) || (materials && materials.length > 0)) {
      return { success: false, error: 'Folder contains files or subfolders. Please delete them first.' }
    }

    const { error } = await supabaseAdmin.from('study_material_folders').delete().eq('id', id)

    if (error) {
      console.error('[v0] Delete folder error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('[v0] Delete folder error:', error)
    return { success: false, error: String(error) }
  }
}

export async function getFolderPath(folderId: string) {
  try {
    const paths: string[] = []
    let currentId: string | null = folderId

    while (currentId) {
      const { data, error } = await supabaseAdmin
        .from('study_material_folders')
        .select('id, name, parent_folder_id')
        .eq('id', currentId)
        .single()

      if (error || !data) break

      paths.unshift(data.name)
      currentId = data.parent_folder_id
    }

    return { success: true, data: paths }
  } catch (error) {
    console.error('[v0] Get folder path error:', error)
    return { success: false, error: String(error) }
  }
}
