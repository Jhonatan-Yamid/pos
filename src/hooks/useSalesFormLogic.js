// hooks/useSalesFormLogic.js
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  calculateTotal as calculateTotalService,
  formatTicketText,
} from "@/services/saleService";
import {
  fetchAvailableProducts,
  fetchAvailableGames,
  fetchAvailableAdditions,
  fetchSaleById,
  mapSaleDataToFormState,
} from "@/services/saleFormService";

const useSalesFormLogic = (saleId, slug) => {
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [tableNumber, setTableNumber] = useState("");
  const [saleStatus, setSaleStatus] = useState("en proceso");
  const [game, setGame] = useState("");
  const [generalObservation, setGeneralObservation] = useState("");
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableGames, setAvailableGames] = useState([]);
  const [availableFetchedAdditions, setAvailableFetchedAdditions] = useState([]);
  const [orderType, setOrderType] = useState("En mesa");

  const isEditing = !!saleId;

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [productsData, gamesData, additionsData] = await Promise.all([
        fetchAvailableProducts(slug),
        fetchAvailableGames(slug),
        fetchAvailableAdditions(slug),
      ]);

      setAvailableProducts(productsData);
      setAvailableGames(gamesData);
      setAvailableFetchedAdditions(additionsData);

      if (saleId) {
        const saleData = await fetchSaleById(slug, saleId);
        const mappedData = mapSaleDataToFormState(saleData);

        setProducts(mappedData.products);
        setTableNumber(mappedData.tableNumber);
        setSaleStatus(mappedData.saleStatus);
        setGeneralObservation(mappedData.generalObservation);
        setGame(mappedData.game);
        setOrderType(mappedData.orderType);
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
      setError(error.message || "Error cargando datos iniciales");
    } finally {
      setIsLoading(false);
    }
  }, [saleId, slug]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const calculateTotal = useCallback(
    () => calculateTotalService(products),
    [products]
  );

  const formatTicket = useCallback(
    () =>
      formatTicketText({
        products,
        total: calculateTotal(),
        tableNumber,
        orderType,
        generalObservation,
        game,
        availableGames,
        availableProducts,
      }),
    [products, calculateTotal, tableNumber, orderType, generalObservation, game, availableGames, availableProducts]
  );

  return {
    isLoading,
    isEditing,
    products,
    setProducts,
    searchTerm,
    setSearchTerm,
    suggestions,
    setSuggestions,
    tableNumber,
    setTableNumber,
    saleStatus,
    setSaleStatus,
    game,
    setGame,
    generalObservation,
    setGeneralObservation,
    error,
    setError,
    showPreview,
    setShowPreview,
    availableProducts,
    availableAdditions: availableFetchedAdditions,
    availableGames,
    calculateTotal,
    formatTicket,
    orderType,
    setOrderType,
  };
};

export default useSalesFormLogic;
