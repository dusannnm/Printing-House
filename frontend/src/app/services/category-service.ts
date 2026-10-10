import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Category } from '../models/category';
import { Message } from '../models/message';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {

  private http = inject(HttpClient);

  private url = 'http://localhost:4000/categories';

  getAll() {
    return this.http.get<Category[]>(this.url);
  }

  add(name: string) {
    return this.http.post<Message>(this.url, { name });
  }

  rename(name: string, newName: string) {
    return this.http.put<Message>(`${this.url}/${encodeURIComponent(name)}`, { new_name: newName });
  }

  remove(name: string) {
    return this.http.delete<Message>(`${this.url}/${encodeURIComponent(name)}`);
  }

  addSubcategory(category: string, name: string) {
    return this.http.post<Message>(`${this.url}/${encodeURIComponent(category)}/subcategory`, { name });
  }

  renameSubcategory(category: string, name: string, newName: string) {
    return this.http.put<Message>(
      `${this.url}/${encodeURIComponent(category)}/subcategory/${encodeURIComponent(name)}`,
      { new_name: newName }
    );
  }

  removeSubcategory(category: string, name: string) {
    return this.http.delete<Message>(
      `${this.url}/${encodeURIComponent(category)}/subcategory/${encodeURIComponent(name)}`
    );
  }
}
