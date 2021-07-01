/**
 * @author Frank Montalvo Ochoa
 * 
 * @description Gestiona y administra el mapa. 
 */

import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

import { Map, tileLayer, Marker, LatLng, icon } from 'leaflet';

import { PlaceModel } from 'src/app/models/place.model';
import { AddressModel } from 'src/app/models/address.model';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {

  static TOKEN: string = 'b9f62d2bd99bbf';
  static URL: string = 'https://us1.locationiq.com/v1';

  private map: Map;
  private marcador: Marker;
  private icono: icon;

  @Input() private isEditing: boolean;
  @Input() private lat: number;
  @Input() private lng: number;
  @Input() private zoom: number;
  @Output() private location: EventEmitter<AddressModel>;

  private address: AddressModel;
  private places: Array<PlaceModel>;


  constructor() {
    this.location = new EventEmitter();
    this.address = new AddressModel();
    this.places = new Array<PlaceModel>();
  }

  ngOnInit() {
    if (!this.zoom)
      this.zoom = 12;
    this.leafletMap();
  }

  /**
   * Inicializa todo el componente del mapa.
   */
  leafletMap() {

    if (this.map) {
      this.map.off();
      this.map.remove();
    }

    this.map = new Map('map').setView([this.lat, this.lng], this.zoom); //Inicializa al mapa.
    tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { //Carga la capa base para el mapa.
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    // Crea un nuevo icono personalizado para el marcador.
    this.icono = icon({
      iconUrl: 'assets/img/marker.png',
      iconSize: [50, 90],
      iconAnchor: [22, 94],
      popupAnchor: [2, -70]
    });

    // Si la variable isEditing tiene un valor de falso, entonces solo permite setear al componente del mapa 
    // en modo de solo lectura; por el contrario, si esta está en verdadero permite la edición de las coordenadas 
    // del marcador en el mapa. 
    if (!this.isEditing) {
      // this.marcador = new Marker([this.lat, this.lng], { icon: this.icono, draggable: this.isEditing });
      this.marcador = new Marker([this.lat, this.lng], { icon: this.icono });
      this.marcador.addTo(this.map);
      this.marcador.bindPopup(`<a href="https://www.google.com/maps/?q=${this.lat},${this.lng}" target="_blank">Google Maps</a>`);
    } else {
      this.marcador = new Marker([this.lat, this.lng], { icon: this.icono });
      this.marcador.addTo(this.map);
      this.map.on('click', this.changeMakerLatLng);
      this.marcador.on('move', this.getMarkerLatLng);
    }
  }

  /**
   * Cambia la latitud y longitud del marcador en el mapa.
   * 
   * @param event
   */
  changeMakerLatLng = (e) => {
    let latlng = e.latlng;
    this.marcador.setLatLng(latlng);
    this.marcador.addTo(this.map);
    this.getLocation();
  }

  /**
   * Obtiene la latitud y longitud de la posición actual del marcador en el mapa.
   * 
   * @param event 
   */
  getMarkerLatLng = (e) => {
    let latlng = e.latlng;
    this.lat = latlng.lat;
    this.lng = latlng.lng;
  }

  /**
   * Usa el API de https://locationiq.com/ para obtener la información del País, estado/provincia y 
   * ciudad a partir de la latitud y longitud que le pasemos como parámetro.
   * 
   * @param lat -> Latitud.
   * @param lng -> Longitud.
   */
  async getLocationData(lat: number, lng: number) {
    let url: string = `${MapComponent.URL}/reverse.php?key=${MapComponent.TOKEN}&lat=${lat}&lon=${lng}&format=json`;
    const response = await fetch(url);
    return await response.json();
  }

  /**
   * Emite una respuesta al componente padre con la dirección de la 
   * posición actual del marcador en el mapa.
   */
  async getLocation() {
    const data = await this.getLocationData(this.lat, this.lng);
    this.address.setCity(data['address']['city']);
    this.address.setCountry(data['address']['country']);
    this.address.setLatitude(this.lat);
    this.address.setLongitude(this.lng);
    this.address.setNeighbourhood(data['address']['neighbourhood']);
    this.address.setPostcode(data['address']['postcode']);
    this.address.setRoad(data['address']['road']);
    this.address.setSuburb(data['address']['suburb']);
    this.address.setState(data['address']['state']);
    this.location.emit(this.address);
  }

  /**
   * Busca ubicaciones por su nombre y las agrega al arreglo de lugares.
   * 
   * @param query 
   * @returns 
   */
  async searchLocation(query: string) {
    if (!query) return;
    this.places = [];
    this.address = new AddressModel();
    this.location.emit(this.address);
    let url: string = `${MapComponent.URL}/search.php?key=${MapComponent.TOKEN}&q=${query}&format=json`;
    const response = await fetch(url);
    const data = await response.json();
    data.forEach((res) => {
      let place: PlaceModel = new PlaceModel(res['display_name'], res['lat'], res['lon'], res['type']);
      this.places.push(place);
    });
  }

  /**
   * Setea la ubicacion selecionada en el mapa.
   * 
   * @param place 
   * @returns 
   */
  setLocation(place: PlaceModel) {
    if (!place) return;

    this.lat = place.getLatitude();
    this.lng = place.getLongitude();

    this.leafletMap();

    const latlng = new LatLng(this.lat, this.lng);
    this.marcador.setLatLng(latlng);
    this.marcador.addTo(this.map);

    this.places = [];

    this.getLocation();
  }

  /**
   * Retorna una lista con los lugares.
   * 
   * @returns 
   */
  getPlaces() {
    return this.places;
  }

}
