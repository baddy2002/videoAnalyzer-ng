import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { GenericItem } from '../../../model/GenericItem';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ListComponent.component.html',
})
export class ListComponent implements OnInit {
  @Input() items: GenericItem[] = [];  // Gli elementi da mostrare
  @Input() itemHeight: string = 'h-20'; // Altezza degli elementi (Tailwind class)
  @Input() itemWidth: string = 'w-full'; // Larghezza degli elementi (Tailwind class)
  @Input() itemsPerPage: number = 10;  // Parametro per la paginazione
  @Input() hoverColor: string = 'hover:bg-gray-100';  // Colore di hover (Tailwind class)
  @Input() linkPath: string = '';  // Path di base per il link
  @Input() itemsTotalNumber: number = 0
  @Input() displayFields: string[] = [];

  private previousRange: { start: number; end: number } = { start: 0, end: 0 };  // Stato precedente

  @Output() pageChange = new EventEmitter<{ start: number; end: number }>();

  currentPage: number = 1;
  paginatedItems: GenericItem[] = [];
  ngOnInit() {
    this.paginateItems();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Se cambia il numero di elementi o il numero totale, resettare la paginazione
    if (changes['items'] || changes['itemsTotalNumber']) {
      this.paginateItems();
    }
  }

  paginateItems() {
    if (!Array.isArray(this.items) || this.items.length === 0) {
      this.paginatedItems = [];
      return;
    }
    console.log(this.paginatedItems);
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedItems = this.items;
    
    // Verifica se il range è cambiato prima di emettere l'evento
    if (this.previousRange.start !== start || this.previousRange.end !== end) {
      console.log("Emitting new range: " + start + "-" + end);
      this.pageChange.emit({ start, end });
      this.previousRange = { start, end };  // Aggiorna il range precedente
    }
    else{
        console.log("Not emitting new range: " + start + "-" + end);
    }
  }

  nextPage() {
    if (this.currentPage * this.itemsPerPage < this.itemsTotalNumber) {
      this.currentPage++;
      this.paginateItems();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.paginateItems();
    }
  }

  getItemLink(uuid: string): string {
    return `${this.linkPath}/${uuid}`;
  }
}
